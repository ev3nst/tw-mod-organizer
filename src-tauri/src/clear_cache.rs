use rayon::prelude::*;
use std::fs;
use tauri::path::BaseDirectory;
use tauri::Manager;
use trash::delete;

#[tauri::command(rename_all = "snake_case")]
pub async fn clear_cache(handle: tauri::AppHandle) -> Result<(), String> {
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if app_cache_dir.exists() && app_cache_dir.is_dir() {
        let entries: Vec<_> = fs::read_dir(&app_cache_dir)
            .map_err(|e| format!("Failed to read cache directory: {}", e))?
            .filter_map(|entry| entry.ok())
            .collect();

        let is_clean_folder = entries.iter().all(|entry| {
            let path = entry.path();
            path.is_file() && path.extension().map_or(false, |ext| ext == "json")
        });

        if is_clean_folder {
            delete(&app_cache_dir).map_err(|e| format!("Failed to delete folder: {}", e))?;
        } else {
            let files: Vec<_> = entries
                .into_iter()
                .filter_map(|entry| {
                    let path = entry.path();
                    if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                        Some(path)
                    } else {
                        None
                    }
                })
                .collect();

            files.par_iter().for_each(|path| {
                if let Err(err) = delete(path) {
                    eprintln!("Failed to delete file: {}", err);
                }
            });
        }
    }

    Ok(())
}
