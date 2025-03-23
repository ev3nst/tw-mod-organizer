use std::path::PathBuf;
use trash::delete;

use super::supported_games::SUPPORTED_GAMES;

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_save_file(app_id: u32, filename: String) -> Result<(), String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let save_file_path = PathBuf::from(
        &game
            .save_path_folder()
            .map_err(|e| format!("Failed to fetch save game folder: {}", e))?,
    )
    .join(filename);
    delete(&save_file_path).map_err(|e| format!("Failed to delete save file: {}", e))?;

    Ok(())
}
