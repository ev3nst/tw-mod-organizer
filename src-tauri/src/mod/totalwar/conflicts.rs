use bincode::{Encode, Decode};
use rayon::prelude::*;
use rpfm_lib::files::pack::Pack;
use rustc_hash::{FxHashMap, FxHashSet};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::Manager;
use tauri::path::BaseDirectory;
use tokio::task;

#[derive(Encode, Decode, PartialEq, Eq, Clone, Debug)]
pub struct FileMetadata {
    pub size: u64,
    pub modified: u64,
}

#[derive(Encode, Decode, Clone, Debug)]
pub struct CacheEntry {
    pub file_paths: Vec<String>,
    pub file_metadata: FxHashMap<String, FileMetadata>,
    pub conflicts: BTreeMap<String, BTreeMap<String, Vec<String>>>,
}

pub async fn conflicts(
    handle: tauri::AppHandle,
    app_id: u32,
    folder_paths: Vec<String>,
) -> Result<BTreeMap<String, BTreeMap<String, Vec<String>>>, String> {
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let cache_bin_filename = format!("mod_conflicts_{}_cache.bin", app_id.to_string());
    let cache_file = app_cache_dir.join(cache_bin_filename);

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

    let file_metadata: FxHashMap<String, FileMetadata> = files_vec
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
        if let Ok(cache_content) = fs::read(&cache_file) {
            let config = bincode::config::standard();
            if let Ok(cache_entry) =
                bincode::decode_from_slice::<CacheEntry, _>(&cache_content, config)
                    .map(|(entry, _)| entry)
            {
                let file_paths_set: FxHashSet<_> = file_paths.iter().cloned().collect();
                let cached_paths_set: FxHashSet<_> =
                    cache_entry.file_paths.iter().cloned().collect();

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
        let mod_files: FxHashMap<String, FxHashSet<String>> = files_vec
            .par_iter()
            .filter_map(|mod_file_path| {
                let packfile =
                    Pack::read_and_merge(&[mod_file_path.clone()], true, false, false).ok()?;
                let paths = packfile
                    .paths()
                    .keys()
                    .filter(|path| !path.ends_with("/version.txt") && *path != "version.txt")
                    .cloned()
                    .collect::<FxHashSet<_>>();
                Some((mod_file_path.to_string_lossy().to_string(), paths))
            })
            .collect();

        let conflicts_by_pack: FxHashMap<_, _> = mod_files
            .par_iter()
            .filter_map(|(mod_file, paths)| {
                let mod_conflicts: FxHashMap<_, _> = mod_files
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

    let mut sorted_conflicts: BTreeMap<String, BTreeMap<String, Vec<String>>> = BTreeMap::new();

    for (mod_file, inner_map) in conflicts_result {
        let mut sorted_inner: BTreeMap<String, Vec<String>> = BTreeMap::new();
        for (other_mod_file, mut shared_paths) in inner_map {
            shared_paths.sort_by(|a, b| {
                let folder_a = a.split('/').next().unwrap_or("");
                let folder_b = b.split('/').next().unwrap_or("");
                folder_a.cmp(folder_b).then_with(|| a.cmp(b))
            });
            sorted_inner.insert(other_mod_file, shared_paths);
        }
        sorted_conflicts.insert(mod_file, sorted_inner);
    }

    let cache_entry = CacheEntry {
        file_paths,
        file_metadata,
        conflicts: sorted_conflicts.clone(),
    };

    let config = bincode::config::standard();
    if let Ok(cache_bin) = bincode::encode_to_vec(&cache_entry, config) {
        let _ = fs::write(&cache_file, cache_bin);
    }

    Ok(sorted_conflicts)
}
