use std::fs;
use std::path::Path;
use tauri::{path::BaseDirectory, Manager};

use crate::utils::{
    create_app_default_paths::create_app_default_paths, roaming_folder::roaming_folder,
    supported_games::SUPPORTED_GAMES,
};

use super::upsert_save_file_meta::SaveFileMeta;

#[tauri::command(rename_all = "snake_case")]
pub async fn fetch_save_file_meta(
    handle: tauri::AppHandle,
    app_id: u64,
    save_file_name: String,
) -> Result<SaveFileMeta, String> {
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

    let save_file_path = save_folder.join(&save_file_name);
    if !save_file_path.exists() {
        return Err("Save file does not exist.".to_string());
    }

    let save_file_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let clean_save_file_name = save_file_name.trim_end_matches(".save");
    let meta_file_path = save_file_meta_folder.join(format!("{}.meta", clean_save_file_name));
    if !meta_file_path.exists() {
        return Err("Save Meta file does not exist.".to_string());
    }

    let meta_content = fs::read_to_string(&meta_file_path)
        .map_err(|e| format!("Failed to read meta file: {}", e))?;

    let mut save_file_meta: Vec<SaveFileMeta> = serde_json::from_str(&meta_content)
        .map_err(|e| format!("Failed to parse meta file: {}", e))?;

    save_file_meta.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    save_file_meta
        .first()
        .cloned()
        .ok_or_else(|| "No valid save file meta found.".to_string())
}
