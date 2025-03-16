use std::fs::read_dir;
use std::path::Path;
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};

use crate::utils::{roaming_folder::roaming_folder, supported_games::SUPPORTED_GAMES};

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveFile {
    pub filename: String,
    pub filesize: u64,
    pub date: u128,
    pub path: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_files(app_id: u64) -> Result<Vec<SaveFile>, String> {
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

                            save_files.push(SaveFile {
                                filename,
                                filesize,
                                date,
                                path: path.to_string_lossy().to_string(),
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
