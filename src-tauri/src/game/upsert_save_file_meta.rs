use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{path::BaseDirectory, Manager};

use crate::utils::{
    create_app_default_paths::create_app_default_paths, roaming_folder::roaming_folder,
    supported_games::SUPPORTED_GAMES,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoadOrderData {
    identifier: String,
    title: String,
    pack_file: Option<String>,
    pack_file_path: Option<String>,
    is_active: bool,
    order_index: u64,
    background_color: Option<String>,
    text_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveFileMeta {
    pub save_file_name: String,
    pub save_file_size: u64,
    pub mod_order_data: Vec<LoadOrderData>,
    pub created_at: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn upsert_save_file_meta(
    handle: tauri::AppHandle,
    app_id: u64,
    save_file_name: String,
    save_file_size: u64,
    mod_order_data: Vec<LoadOrderData>,
) -> Result<String, String> {
    let _ = create_app_default_paths(handle.clone());
    let roaming_folder = roaming_folder().ok_or_else(|| "Roaming folder could not be resolved.")?;

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let save_folder = Path::new(&roaming_folder)
        .join("The Creative Assembly")
        .join(&game.save_path_folder)
        .join("save_games");

    if !save_folder.exists() {
        return Err("Save folder does not exist.".to_string());
    }

    if !save_file_name.ends_with(".save") {
        return Err("Save files must end with .save extension.".to_string());
    }

    let save_file_path = save_folder.join(&save_file_name);
    if !save_file_path.exists() {
        return Err("Save file does not exist.".to_string());
    }

    let save_file_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let meta_file_path = save_file_meta_folder
        .join(&save_file_name)
        .with_extension("meta");

    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to get system time: {}", e))?
        .as_secs();

    let mut save_file_metas: Vec<SaveFileMeta> = if meta_file_path.exists() {
        let meta_content = fs::read_to_string(&meta_file_path)
            .map_err(|e| format!("Failed to read meta file: {}", e))?;

        serde_json::from_str(&meta_content)
            .map_err(|e| format!("Failed to parse meta file JSON: {}", e))?
    } else {
        Vec::new()
    };

    save_file_metas.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    let should_add_entry = if let Some(latest_entry) = save_file_metas.first() {
        latest_entry.save_file_size != save_file_size
    } else {
        true
    };

    if should_add_entry {
        let new_meta = SaveFileMeta {
            save_file_name: save_file_name.clone(),
            save_file_size,
            mod_order_data,
            created_at: current_timestamp,
        };

        save_file_metas.push(new_meta);
        save_file_metas.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        if save_file_metas.len() > 10 {
            save_file_metas.truncate(10);
        }

        let meta_json = serde_json::to_string_pretty(&save_file_metas)
            .map_err(|e| format!("Failed to serialize meta data: {}", e))?;

        fs::write(&meta_file_path, meta_json)
            .map_err(|e| format!("Failed to write meta file: {}", e))?;
    }

    meta_file_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to convert meta file path to string.".to_string())
}
