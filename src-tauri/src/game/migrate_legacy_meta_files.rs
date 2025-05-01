use std::fs;
use tauri::{Manager, path::BaseDirectory};

pub fn migrate_legacy_meta_files(handle: &tauri::AppHandle, app_id: u32) -> Result<(), String> {
    let old_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve old meta directory: {}", e))?;

    let new_meta_folder = old_meta_folder.join(app_id.to_string());
    if !new_meta_folder.exists() {
        fs::create_dir_all(&new_meta_folder)
            .map_err(|e| format!("Failed to create new meta directory: {}", e))?;
    }

    if !old_meta_folder.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(&old_meta_folder)
        .map_err(|e| format!("Failed to read old meta directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        if path.is_file()
            && path.extension().map_or(false, |ext| ext == "meta")
            && !path
                .file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with(&format!("{}.", app_id))
        {
            let file_name = path.file_name().unwrap().to_string_lossy().to_string();
            let dest_path = new_meta_folder.join(&file_name);

            if dest_path.exists() {
                continue;
            }

            fs::copy(&path, &dest_path).map_err(|e| format!("Failed to copy meta file: {}", e))?;
        }
    }

    Ok(())
}
