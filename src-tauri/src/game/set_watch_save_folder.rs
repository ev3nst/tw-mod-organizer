use std::fs::create_dir_all;
use std::path::PathBuf;

use super::supported_games::SUPPORTED_GAMES;
use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub async fn set_watch_save_folder(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
) -> Result<(), String> {
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
        create_dir_all(&save_folder).map_err(|e| {
            format!(
                "Given save path does not exists and could not be created. Err: {}",
                e
            )
        })?;
    }

    let mut path = app_state.save_folder_path.lock().await;
    *path = PathBuf::from(save_folder);
    Ok(())
}
