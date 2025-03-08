use std::path::Path;
use trash::delete;

use crate::get_save_files::get_roaming_folder;
use crate::supported_games::SUPPORTED_GAMES;

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_save_file(app_id: u64, filename: String) -> Result<(), String> {
    let roaming_folder =
        get_roaming_folder().ok_or_else(|| "Roaming folder could not be resolved.")?;

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let save_file_path = Path::new(&roaming_folder)
        .join("The Creative Assembly")
        .join(&game.save_path_folder)
        .join("save_games")
        .join(filename);
    delete(&save_file_path).map_err(|e| format!("Failed to delete save file: {}", e))?;

    Ok(())
}
