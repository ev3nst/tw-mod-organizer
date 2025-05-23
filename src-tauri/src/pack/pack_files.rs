use bincode::{Decode, Encode};
use rpfm_lib::files::pack::Pack;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::Manager;
use tauri::path::BaseDirectory;

#[derive(Encode, Decode)]
struct FileMetadata {
    size: u64,
    modified: u64,
}

#[derive(Encode, Decode)]
struct PackFilesData {
    json_string: String,
}

#[derive(Encode, Decode)]
struct CacheEntry {
    file_path: String,
    file_metadata: FileMetadata,
    pack_files: PackFilesData,
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
        "pack_files_{}.bin",
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
        if let Ok(cache_content) = fs::read(&cache_file) {
            let config = bincode::config::standard();
            if let Ok(cache_entry) =
                bincode::decode_from_slice::<CacheEntry, _>(&cache_content, config)
                    .map(|(entry, _)| entry)
            {
                if cache_entry.file_path == pack_file_path_str
                    && cache_entry.file_metadata.size == current_metadata.size
                    && cache_entry.file_metadata.modified == current_metadata.modified
                {
                    if let Ok(json_value) =
                        serde_json::from_str(&cache_entry.pack_files.json_string)
                    {
                        return Ok(json_value);
                    }
                }
            }
        }
    }

    let packfile = Pack::read_and_merge(&[pack_file_path], true, false, false)
        .map_err(|e| format!("Failed to read pack file: {:?}", e))?;

    let mut raw_tree: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    let mut all_paths: Vec<String> = Vec::new();
    for (_lowercased, originals) in packfile.paths() {
        if !originals.is_empty() {
            all_paths.push(originals[0].clone());
        }
    }

    all_paths.sort();

    for path in all_paths {
        let parts: Vec<&str> = path.split('/').collect();
        if !parts.is_empty() {
            insert_path_recursive(&mut raw_tree, &parts, 1);
        }
    }

    collect_files_in_leaf_nodes(&mut raw_tree, 1);

    let result_json = serde_json::to_value(raw_tree.clone())
        .map_err(|e| format!("Failed to serialize pack files: {}", e))?;

    let json_string = serde_json::to_string(&result_json)
        .map_err(|e| format!("Failed to convert JSON to string: {}", e))?;

    let cache_entry = CacheEntry {
        file_path: pack_file_path_str,
        file_metadata: current_metadata,
        pack_files: PackFilesData { json_string },
    };

    let config = bincode::config::standard();
    if let Ok(cache_bin) = bincode::encode_to_vec(&cache_entry, config) {
        let _ = fs::write(&cache_file, cache_bin);
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
                if let serde_json::Value::Array(arr) = existing {
                    let file_name = first.to_string();
                    if !arr
                        .iter()
                        .any(|v| v.as_str().map_or(false, |s| s == file_name))
                    {
                        arr.push(serde_json::Value::String(file_name));
                        arr.sort_by(|a, b| {
                            let a_str = a.as_str().unwrap_or("");
                            let b_str = b.as_str().unwrap_or("");
                            a_str.cmp(b_str)
                        });
                    }
                }
            } else {
                map.insert(first.to_string(), serde_json::Value::Array(vec![]));
            }
        }
        Some((first, rest)) => {
            let sub_map = map
                .entry(first.to_string())
                .or_insert_with(|| serde_json::json!({}));
            if let serde_json::Value::Object(obj) = sub_map {
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

    let keys: Vec<String> = map.keys().cloned().collect();
    for key in keys {
        if let Some(value) = map.get(&key) {
            if let serde_json::Value::Object(sub_map) = value {
                let mut files = Vec::new();
                let mut has_folders = false;

                for (sub_key, sub_value) in sub_map.iter() {
                    if sub_value.is_object() {
                        has_folders = true;
                    } else if sub_value.is_array() {
                        files.push(sub_key.clone());
                    }
                }

                if !has_folders && !files.is_empty() {
                    files.sort();
                    map.insert(key.clone(), serde_json::json!(files));
                } else if has_folders {
                    if let Some(serde_json::Value::Object(obj)) = map.get_mut(&key) {
                        collect_files_in_leaf_nodes(obj, depth + 1);
                    }
                }
            }
        }
    }
}
