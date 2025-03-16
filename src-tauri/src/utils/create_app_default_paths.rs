use std::fs::create_dir_all;
use tauri::{path::BaseDirectory, Manager};

pub fn create_app_default_paths(handle: tauri::AppHandle) -> Result<(), String> {
    let default_downloads_path = handle
        .path()
        .resolve("downloads".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;
    create_dir_all(default_downloads_path)
        .map_err(|e| format!("Failed to create default downloads directory: {}", e))?;

    let default_mods_path = handle
        .path()
        .resolve("mods".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;
    create_dir_all(default_mods_path)
        .map_err(|e| format!("Failed to create default mods directory: {}", e))?;

    let default_exports_path = handle
        .path()
        .resolve("exports".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;
    create_dir_all(default_exports_path)
        .map_err(|e| format!("Failed to create default exports directory: {}", e))?;

    Ok(())
}
