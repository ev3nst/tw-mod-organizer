use rayon::prelude::*;
use rpfm_lib::files::pack::Pack;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::path::BaseDirectory;
use tauri::Manager;
use tokio::task;

use crate::r#mod::conflicts::{CacheEntry, FileMetadata};

pub async fn conflicts(
    handle: tauri::AppHandle,
    app_id: u32,
    folder_paths: Vec<String>,
) -> Result<HashMap<String, HashMap<String, Vec<String>>>, String> {
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let cache_json_filename = format!("mod_conflicts_{}_cache.json", app_id.to_string());
    let cache_file = app_cache_dir.join(cache_json_filename);

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

    let file_paths: Vec<String> = files_vec
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    let file_metadata: HashMap<String, FileMetadata> = files_vec
        .par_iter()
        .filter_map(|path| {
            let metadata = fs::metadata(path).ok()?;
            let modified = metadata
                .modified()
                .ok()?
                .duration_since(SystemTime::UNIX_EPOCH)
                .ok()?
                .as_secs();
            Some((
                path.to_string_lossy().to_string(),
                FileMetadata {
                    size: metadata.len(),
                    modified,
                },
            ))
        })
        .collect();

    if cache_file.exists() {
        let cache_content = fs::read_to_string(&cache_file).ok();
        if let Some(content) = cache_content {
            if let Ok(cache_entry) = serde_json::from_str::<CacheEntry>(&content) {
                let file_paths_set: HashSet<_> = file_paths.iter().cloned().collect();
                let cached_paths_set: HashSet<_> = cache_entry.file_paths.iter().cloned().collect();

                if file_paths_set == cached_paths_set {
                    let all_files_unchanged = file_metadata.iter().all(|(path, metadata)| {
                        cache_entry
                            .file_metadata
                            .get(path)
                            .map_or(false, |cached| cached == metadata)
                    });

                    if all_files_unchanged {
                        return Ok(cache_entry.conflicts);
                    }
                }
            }
        }
    }

    let conflicts_result = task::spawn_blocking(move || {
        let mod_files: HashMap<String, HashSet<String>> = files_vec
            .par_iter()
            .filter_map(|mod_file_path| {
                let packfile =
                    Pack::read_and_merge(&[mod_file_path.clone()], true, false, false).ok()?;
                let paths = packfile
                    .paths()
                    .keys()
                    .filter(|path| !path.ends_with("/version.txt") && *path != "version.txt")
                    .cloned()
                    .collect::<HashSet<_>>();
                Some((mod_file_path.to_string_lossy().to_string(), paths))
            })
            .collect();

        let conflicts_by_pack: HashMap<_, _> = mod_files
            .par_iter()
            .filter_map(|(mod_file, paths)| {
                let mod_conflicts: HashMap<_, _> = mod_files
                    .par_iter()
                    .filter_map(|(other_mod_file, other_paths)| {
                        (mod_file != other_mod_file)
                            .then(|| {
                                let shared_paths =
                                    paths.intersection(other_paths).cloned().collect::<Vec<_>>();
                                (!shared_paths.is_empty())
                                    .then(|| (other_mod_file.clone(), shared_paths))
                            })
                            .flatten()
                    })
                    .collect();
                (!mod_conflicts.is_empty()).then(|| (mod_file.clone(), mod_conflicts))
            })
            .collect();

        conflicts_by_pack
    })
    .await
    .map_err(|e| format!("Task failed: {:?}", e))?;

    let cache_entry = CacheEntry {
        file_paths,
        file_metadata,
        conflicts: conflicts_result.clone(),
    };

    let cache_json = serde_json::to_string(&cache_entry)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;

    fs::write(&cache_file, cache_json).map_err(|e| format!("Failed to write cache file: {}", e))?;

    Ok(conflicts_result)
}
