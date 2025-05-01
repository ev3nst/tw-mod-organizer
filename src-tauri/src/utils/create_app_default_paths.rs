use std::fs::create_dir_all;
use tauri::{Manager, path::BaseDirectory};

use crate::game::supported_games::SUPPORTED_GAMES;

pub fn create_app_default_paths(handle: tauri::AppHandle) -> Result<(), String> {
    let default_exports_path = handle
        .path()
        .resolve("exports".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;
    create_dir_all(&default_exports_path)
        .map_err(|e| format!("Failed to create default exports directory: {}", e))?;

    let default_downloads_path = handle
        .path()
        .resolve("downloads".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let default_mods_path = handle
        .path()
        .resolve("mods".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let default_save_file_meta_folder_path = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    for game in SUPPORTED_GAMES {
        let game_save_meta_path =
            default_save_file_meta_folder_path.join(game.steam_id.to_string());
        create_dir_all(&game_save_meta_path).map_err(|e| {
            format!(
                "Failed to create save file meta directory for {}: {}",
                game.steam_id, e
            )
        })?;

        let game_downloads_path = default_downloads_path.join(game.steam_id.to_string());
        create_dir_all(&game_downloads_path)
            .map_err(|e| format!("Failed to create default downloads directory: {}", e))?;

        let game_mods_path = default_mods_path.join(game.steam_id.to_string());
        create_dir_all(&game_mods_path)
            .map_err(|e| format!("Failed to create default mods directory: {}", e))?;
    }

    Ok(())
}
