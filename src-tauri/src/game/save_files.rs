use std::fs::read_dir;
use std::path::Path;
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};
use tauri::{path::BaseDirectory, Manager};

use crate::utils::{
    create_app_default_paths::create_app_default_paths, roaming_folder::roaming_folder,
    supported_games::SUPPORTED_GAMES,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveFile {
    pub filename: String,
    pub filesize: u64,
    pub date: u128,
    pub path: String,
    pub meta_exists: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_files(handle: tauri::AppHandle, app_id: u64) -> Result<Vec<SaveFile>, String> {
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
        return Ok(vec![]);
    }

    let save_file_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let mut save_files = Vec::new();
    match read_dir(save_folder) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        if path.extension() == Some(std::ffi::OsStr::new("save")) {
                            let filename = path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string();
                            let filesize = match path.metadata() {
                                Ok(metadata) => metadata.len(),
                                Err(_) => 0,
                            };
                            let date =
                                match path.metadata().and_then(|metadata| metadata.modified()) {
                                    Ok(modified_time) => {
                                        match modified_time.duration_since(UNIX_EPOCH) {
                                            Ok(duration) => duration.as_millis(),
                                            Err(_) => 0,
                                        }
                                    }
                                    Err(_) => 0,
                                };

                            let clean_save_file_name = filename.trim_end_matches(".save");
                            let meta_file_path = save_file_meta_folder
                                .join(format!("{}.meta", clean_save_file_name));

                            let meta_exists = meta_file_path.exists();
                            save_files.push(SaveFile {
                                filename,
                                filesize,
                                date,
                                path: path.to_string_lossy().to_string(),
                                meta_exists,
                            });
                        }
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Error reading save folder: {}", e)),
    }

    Ok(save_files)
}
