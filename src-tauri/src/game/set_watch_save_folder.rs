use std::fs::create_dir_all;
use std::path::{Path, PathBuf};

use crate::utils::roaming_folder::roaming_folder;
use crate::utils::supported_games::SUPPORTED_GAMES;
use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub async fn set_watch_save_folder(
    app_state: tauri::State<'_, AppState>,
    app_id: u64,
) -> Result<(), String> {
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
