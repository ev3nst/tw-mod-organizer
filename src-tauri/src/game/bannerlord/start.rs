use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;

use crate::game::find_installation_path::find_installation_path;
use crate::game::supported_games::SUPPORTED_GAMES;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BannerlordMod {
    identifier: String,
    bannerlord_id: String,
    mod_path: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn start_game_bannerlord(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
    mods: Vec<BannerlordMod>,
    _save_game: Option<String>,
) -> Result<String, String> {
    let steam_state = &app_state.steam_state;
    steam_state.drop_all_clients();

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let game_installation_path = match find_installation_path(game.steam_folder_name.to_string()) {
        Some(path) => path,
        None => {
            return Err(format!(
                "Could not find installation path for game with app_id {}",
                app_id
            ))
        }
    };

    let exe_directory = if game.exe_folder.is_empty() {
        game_installation_path.clone()
    } else {
        Path::new(&game_installation_path.replace("\\", "/"))
            .join(game.exe_folder.replace("\\", "/"))
            .to_string_lossy()
            .into_owned()
    };

    let mut modules_arg = String::new();
    if !mods.is_empty() {
        let mod_ids: Vec<String> = mods
            .iter()
            .map(|mod_info| mod_info.bannerlord_id.clone())
            .collect();

        modules_arg = format!("_MODULES_*{}*_MODULES_", mod_ids.join("*"));

        let custom_mods: Vec<&BannerlordMod> = mods
            .iter()
            .filter(|mod_info| {
                !mod_info.mod_path.is_empty() && !mod_info.mod_path.contains("Modules")
            })
            .collect();

        if !custom_mods.is_empty() {
            let paths_param: Vec<String> = custom_mods
                .iter()
                .map(|mod_info| format!("{}:{}", mod_info.bannerlord_id, mod_info.mod_path))
                .collect();

            modules_arg.push_str(&format!(
                " _MODULES_PATHS_*{}*_MODULES_PATHS_",
                paths_param.join("*")
            ));
        }
    }

    let exe_path = Path::new(&exe_directory).join("Bannerlord.exe");
    let mut command = Command::new(&exe_path);
    command.current_dir(&exe_directory);
    command.creation_flags(0x08000000);

    if !modules_arg.is_empty() {
        command.arg(&modules_arg);
    }

    let mut command_str = exe_path.to_string_lossy().into_owned();
    if !modules_arg.is_empty() {
        command_str.push_str(" ");
        command_str.push_str(&modules_arg);
    }

    command
        .spawn()
        .map_err(|e| format!("Failed to start game: {}", e))?;

    Ok(command_str)
}
