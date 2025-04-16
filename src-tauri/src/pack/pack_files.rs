use rpfm_lib::files::pack::Pack;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[derive(Serialize, Deserialize)]
struct FileMetadata {
    size: u64,
    modified: u64,
}

#[derive(Serialize, Deserialize)]
struct CacheEntry {
    file_path: String,
    file_metadata: FileMetadata,
    pack_files: serde_json::Value,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pack_files(
    handle: tauri::AppHandle,
    pack_file_path: String,
) -> Result<serde_json::Value, String> {
    let pack_file_path = PathBuf::from(pack_file_path);
    if !pack_file_path.exists() {
        return Err(format!("Pack file does not exist: {:?}", pack_file_path));
    }

    if pack_file_path.extension().map_or(true, |ext| ext != "pack") {
        return Err(format!("File is not a .pack file: {:?}", pack_file_path));
    }
    let pack_file_path_str = pack_file_path.to_string_lossy().to_string();

    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let cache_filename = format!(
        "pack_files_{}.json",
        pack_file_path.file_name().unwrap().to_string_lossy()
    );
    let cache_file = app_cache_dir.join(cache_filename);

    let metadata = fs::metadata(&pack_file_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let current_metadata = FileMetadata {
        size: metadata.len(),
        modified: metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0),
    };

    if cache_file.exists() {
        if let Ok(cache_content) = fs::read_to_string(&cache_file) {
            if let Ok(cache_entry) = serde_json::from_str::<CacheEntry>(&cache_content) {
                if cache_entry.file_path == pack_file_path_str
                    && cache_entry.file_metadata.size == current_metadata.size
                    && cache_entry.file_metadata.modified == current_metadata.modified
                {
                    return Ok(cache_entry.pack_files);
                }
            }
        }
    }

    let packfile = Pack::read_and_merge(&[pack_file_path], true, false, false)
        .map_err(|e| format!("Failed to read pack file: {:?}", e))?;

    let mut raw_tree: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    for path in packfile.paths().keys() {
        let parts: Vec<&str> = path.split('/').collect();
        if parts.is_empty() {
            continue;
        }
        insert_path_recursive(&mut raw_tree, &parts, 1);
    }

    collect_files_in_leaf_nodes(&mut raw_tree, 1);

    let result_json = serde_json::to_value(raw_tree.clone())
        .map_err(|e| format!("Failed to serialize pack files: {}", e))?;

    let cache_entry = CacheEntry {
        file_path: pack_file_path_str,
        file_metadata: current_metadata,
        pack_files: result_json.clone(),
    };

    if let Ok(cache_json) = serde_json::to_string(&cache_entry) {
        let _ = fs::write(&cache_file, cache_json);
    }

    Ok(result_json)
}

fn insert_path_recursive(
    map: &mut serde_json::Map<String, serde_json::Value>,
    path_parts: &[&str],
    depth: usize,
) {
    if depth > 10 {
        return;
    }

    match path_parts.split_first() {
        Some((first, rest)) if rest.is_empty() => {
            if let Some(existing) = map.get_mut(&first.to_string()) {
                if existing.is_array() {
                    // Valid state: array of files.
                }
            } else {
                map.insert(first.to_string(), serde_json::json!([]));
            }
        }
        Some((first, rest)) => {
            let sub_map = map
                .entry(first.to_string())
                .or_insert_with(|| serde_json::json!({}));
            if let serde_json::Value::Object(ref mut obj) = sub_map {
                insert_path_recursive(obj, rest, depth + 1);
            }
        }
        None => {}
    }
}

fn collect_files_in_leaf_nodes(map: &mut serde_json::Map<String, serde_json::Value>, depth: usize) {
    if depth > 10 {
        return;
    }

    for (key, value) in map.clone().iter() {
        match value {
            serde_json::Value::Object(sub_map) => {
                let mut files = vec![];
                let mut folders = serde_json::Map::new();

                for (sub_key, sub_value) in sub_map.iter() {
                    if sub_value.is_object() {
                        folders.insert(sub_key.clone(), sub_value.clone());
                    } else if sub_value.is_array() {
                        files.push(sub_key.clone());
                    }
                }

                if folders.is_empty() && !files.is_empty() {
                    map.insert(key.clone(), serde_json::json!(files));
                } else {
                    if let serde_json::Value::Object(ref mut obj) = map.get_mut(key).unwrap() {
                        collect_files_in_leaf_nodes(obj, depth + 1);
                    }
                }
            }
            _ => {}
        }
    }
}
