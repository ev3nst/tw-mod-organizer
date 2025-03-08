use rayon::prelude::*;
use rpfm_lib::files::pack::Pack;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use tokio::task;

#[tauri::command(rename_all = "snake_case")]
pub async fn get_pack_conflicts(
    folder_paths: Vec<String>,
) -> Result<HashMap<String, HashMap<String, Vec<String>>>, String> {
    let files_vec: Vec<PathBuf> = folder_paths
        .par_iter()
        .flat_map(|folder_path| {
            let path = Path::new(folder_path);
            if path.is_dir() {
                fs::read_dir(path)
                    .into_iter()
                    .flatten()
                    .flat_map(|entry| entry.ok())
                    .flat_map(|entry| {
                        let entry_path = entry.path();
                        if entry_path.is_dir() {
                            fs::read_dir(&entry_path)
                                .into_iter()
                                .flatten()
                                .flat_map(|sub_entry| {
                                    let sub_path = sub_entry.ok()?.path();
                                    (sub_path.extension()?.to_str() == Some("pack"))
                                        .then_some(sub_path)
                                })
                                .collect::<Vec<_>>()
                        } else {
                            match entry_path.extension().and_then(|ext| ext.to_str()) {
                                Some("pack") => Some(entry_path),
                                _ => None,
                            }
                            .into_iter()
                            .collect()
                        }
                    })
                    .collect()
            } else {
                vec![]
            }
        })
        .collect();

    let result = task::spawn_blocking(move || {
        let pack_files: HashMap<String, HashSet<String>> = files_vec
            .par_iter()
            .filter_map(|pack_file_path| {
                let packfile =
                    Pack::read_and_merge(&[pack_file_path.clone()], true, false, false).ok()?;
                let paths = packfile
                    .paths()
                    .keys()
                    .filter(|path| !path.ends_with("/version.txt") && *path != "version.txt")
                    .cloned()
                    .collect::<HashSet<_>>();
                Some((pack_file_path.to_string_lossy().to_string(), paths))
            })
            .collect();

        let conflicts_by_pack: HashMap<_, _> = pack_files
            .par_iter()
            .filter_map(|(pack_file, paths)| {
                let pack_conflicts: HashMap<_, _> = pack_files
                    .par_iter()
                    .filter_map(|(other_pack_file, other_paths)| {
                        (pack_file != other_pack_file)
                            .then(|| {
                                let shared_paths =
                                    paths.intersection(other_paths).cloned().collect::<Vec<_>>();
                                (!shared_paths.is_empty())
                                    .then(|| (other_pack_file.clone(), shared_paths))
                            })
                            .flatten()
                    })
                    .collect();
                (!pack_conflicts.is_empty()).then(|| (pack_file.clone(), pack_conflicts))
            })
            .collect();

        Ok(conflicts_by_pack)
    })
    .await
    .map_err(|e| format!("Task failed: {:?}", e))?;

    result
}
