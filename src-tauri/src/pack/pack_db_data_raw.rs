use rpfm_lib::files::pack::Pack;
use rpfm_lib::files::{Container, DecodeableExtraData, FileType, RFileDecoded};
use rpfm_lib::schema::Schema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::path::BaseDirectory;
use tauri::Manager;

use crate::game::supported_games::SUPPORTED_GAMES;

#[derive(Serialize, Deserialize)]
struct FileMetadata {
    size: u64,
    modified: u64,
}

#[derive(Serialize, Deserialize)]
struct CacheEntry {
    file_path: String,
    file_metadata: FileMetadata,
    db_data: HashMap<String, serde_json::Value>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pack_db_data_raw(
    handle: tauri::AppHandle,
    app_id: u32,
    pack_file_path: String,
) -> Result<HashMap<String, serde_json::Value>, String> {
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
        "pack_db_data_raw_{}.json",
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
                    return Ok(cache_entry.db_data);
                }
            }
        }
    }

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let exe_path = env::current_exe().unwrap();
    let exe_dir = exe_path.parent().unwrap().to_str().unwrap();

    let schema_file_path = PathBuf::from(exe_dir).join(game.schema_file);
    let schema = Schema::load(&schema_file_path, None)
        .map_err(|e| format!("Failed to load schema: {}", e))?;

    let mut packfile = Pack::read_and_merge(&[pack_file_path], true, false, false)
        .map_err(|e| format!("Failed to read pack file: {:?}", e))?;

    let db_files = packfile.files_by_type_mut(&[FileType::DB]);
    if db_files.is_empty() {
        let cache_entry = CacheEntry {
            file_path: pack_file_path_str.clone(),
            file_metadata: current_metadata,
            db_data: HashMap::new(),
        };

        if let Ok(cache_json) = serde_json::to_string(&cache_entry) {
            let _ = fs::write(&cache_file, cache_json);
        }

        return Ok(HashMap::new());
    }

    let mut decode_extra_data = DecodeableExtraData::default();
    decode_extra_data.set_schema(Some(&schema));
    let extra_data = Some(decode_extra_data);

    let mut table_data_map = HashMap::new();

    for file in db_files {
        match file.decode(&extra_data, false, true) {
            Ok(Some(decoded)) => {
                if let RFileDecoded::DB(table_data) = decoded {
                    table_data_map.insert(
                        file.path_in_container().path_raw().to_owned(),
                        serde_json::to_value(table_data.table())
                            .map_err(|e| format!("Failed to serialize table data: {}", e))?,
                    );
                }
            }
            Ok(None) => println!("File could not be decoded: {:?}", file.path_in_container()),
            Err(e) => println!("Error decoding file {:?}: {}", file.path_in_container(), e),
        }
    }

    let cache_entry = CacheEntry {
        file_path: pack_file_path_str,
        file_metadata: current_metadata,
        db_data: table_data_map.clone(),
    };

    if let Ok(cache_json) = serde_json::to_string(&cache_entry) {
        let _ = fs::write(&cache_file, cache_json);
    }

    Ok(table_data_map)
}
