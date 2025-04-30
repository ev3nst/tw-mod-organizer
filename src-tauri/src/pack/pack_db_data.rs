use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::path::BaseDirectory;
use tauri::Manager;

use super::pack_db_data_raw::{get_pack_db_table_data, FileMetadata};

#[derive(Serialize, Deserialize)]
struct CacheEntry {
    file_path: String,
    file_metadata: FileMetadata,
    db_data: serde_json::Value,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pack_db_data(
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
        "pack_db_data_parsed_{}.json",
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

    let table_data_map = get_pack_db_table_data(
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
        db_data: parsed_data.clone(),
    };

    if let Ok(cache_json) = serde_json::to_string(&cache_entry) {
        let _ = fs::write(&cache_file, cache_json);
    }

    Ok(parsed_data)
}

pub fn parse_raw_pack_db(
    db_data_raw: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let mut mod_db_parsed = serde_json::Map::new();

    let mut paths: Vec<&String> = db_data_raw.keys().collect();
    paths.sort();

    for raw_path in paths {
        let table_data_value = &db_data_raw[raw_path];
        let table_data = match table_data_value.as_object() {
            Some(obj) => obj,
            None => continue,
        };

        let db_path_clean = if raw_path.starts_with("db/") {
            &raw_path[3..]
        } else {
            raw_path
        };

        let db_path_split: Vec<String> = db_path_clean.split('/').map(String::from).collect();
        let definition = match table_data.get("definition") {
            Some(def) => match def.as_object() {
                Some(def_obj) => def_obj,
                None => continue,
            },
            None => continue,
        };

        let fields = match definition.get("fields") {
            Some(fields_value) => match fields_value.as_array() {
                Some(fields_array) => fields_array,
                None => continue,
            },
            None => continue,
        };

        let mut field_order_mapping: Vec<(usize, &serde_json::Value, i64)> = fields
            .iter()
            .enumerate()
            .map(|(idx, field)| {
                let ca_order = field.get("ca_order").and_then(|v| v.as_i64()).unwrap_or(0);
                (idx, field, ca_order)
            })
            .collect();

        field_order_mapping.sort_by_key(|&(_, _, order)| order);

        let table_rows = match table_data.get("table_data") {
            Some(rows) => match rows.as_array() {
                Some(rows_array) => rows_array,
                None => continue,
            },
            None => continue,
        };

        let parsed_rows = table_rows
            .iter()
            .map(|row| {
                let row_array = match row.as_array() {
                    Some(arr) => arr,
                    None => return serde_json::Value::Null,
                };

                let mut row_obj = serde_json::Map::new();
                for &(orig_idx, field, _) in &field_order_mapping {
                    if orig_idx < row_array.len() {
                        let cell = &row_array[orig_idx];

                        if !cell.is_null() {
                            if let Some(field_name) = field.get("name").and_then(|n| n.as_str()) {
                                if let Some(cell_obj) = cell.as_object() {
                                    if let Some((_, value)) = cell_obj.iter().next() {
                                        row_obj.insert(field_name.to_string(), value.clone());
                                    }
                                }
                            }
                        }
                    }
                }

                serde_json::Value::Object(row_obj)
            })
            .collect::<Vec<serde_json::Value>>();
        ensure_path_exists(&mut mod_db_parsed, &db_path_split, parsed_rows);
    }

    Ok(serde_json::Value::Object(mod_db_parsed))
}

fn ensure_path_exists(
    root: &mut serde_json::Map<String, serde_json::Value>,
    path: &[String],
    parsed_rows: Vec<serde_json::Value>,
) {
    if path.is_empty() {
        return;
    }

    let path_len = path.len();
    let mut current_map = root;

    for i in 0..path_len - 1 {
        let part = &path[i];

        if !current_map.contains_key(part) {
            current_map.insert(
                part.clone(),
                serde_json::Value::Object(serde_json::Map::new()),
            );
        }

        let next_level = current_map.get_mut(part).unwrap();

        if !next_level.is_object() {
            *next_level = serde_json::Value::Object(serde_json::Map::new());
        }

        if let serde_json::Value::Object(ref mut map) = next_level {
            current_map = map;
        } else {
            return;
        }
    }

    if let Some(last_part) = path.last() {
        current_map.insert(last_part.clone(), serde_json::Value::Array(parsed_rows));
    }
}
