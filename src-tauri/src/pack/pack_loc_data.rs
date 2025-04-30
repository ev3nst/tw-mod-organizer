use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::path::BaseDirectory;
use tauri::Manager;

use super::pack_db_data::parse_raw_pack_db;
use super::pack_loc_data_raw::get_pack_loc_table_data;
use super::pack_loc_data_raw::FileMetadata;

#[derive(Serialize, Deserialize)]
struct CacheEntry {
    file_path: String,
    file_metadata: FileMetadata,
    loc_data: serde_json::Value,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pack_loc_data(
    handle: tauri::AppHandle,
    app_id: u32,
    pack_file_path: String,
) -> Result<serde_json::Value, String> {
    let pack_file_path = PathBuf::from(&pack_file_path);
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
        "pack_loc_data_parsed_{}.json",
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
                    return Ok(cache_entry.loc_data);
                }
            }
        }
    }

    let table_data_map = get_pack_loc_table_data(
        app_id,
        pack_file_path,
        pack_file_path_str.clone(),
        current_metadata.clone(),
        cache_file.clone(),
    )?;
    let parsed_data = parse_raw_pack_db(&table_data_map)?;

    let cache_entry = CacheEntry {
        file_path: pack_file_path_str,
        file_metadata: current_metadata,
        loc_data: parsed_data.clone(),
    };

    if let Ok(cache_json) = serde_json::to_string(&cache_entry) {
        let _ = fs::write(&cache_file, cache_json);
    }

    Ok(parsed_data)
}
