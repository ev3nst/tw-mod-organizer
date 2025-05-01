use std::time::UNIX_EPOCH;
use std::{fs::read_dir, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{Manager, path::BaseDirectory};

use super::migrate_legacy_meta_files::migrate_legacy_meta_files;
use super::supported_games::SUPPORTED_GAMES;
use crate::utils::create_app_default_paths::create_app_default_paths;

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveFile {
    pub filename: String,
    pub filesize: u64,
    pub date: u128,
    pub path: String,
    pub meta_exists: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_files(handle: tauri::AppHandle, app_id: u32) -> Result<Vec<SaveFile>, String> {
    let _ = create_app_default_paths(handle.clone());
    let _ = migrate_legacy_meta_files(&handle, app_id);

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let save_folder = PathBuf::from(
        &game
            .save_path_folder()
            .map_err(|e| format!("Failed to fetch save game folder: {}", e))?,
    );

    if !save_folder.exists() {
        return Ok(vec![]);
    }

    let save_file_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?
        .join(app_id.to_string());

    let mut save_files = Vec::new();
    match read_dir(save_folder) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        if path.extension() == Some(std::ffi::OsStr::new(game.save_file_extension))
                        {
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

                            let clean_save_file_name = filename
                                .trim_end_matches(&format!(".{}", game.save_file_extension));

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
