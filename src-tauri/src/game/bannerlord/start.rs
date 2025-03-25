use runas;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
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

fn create_symlinks_batch_script(
    game_installation_path: &str,
    mods: &[(&str, &str, String)],
) -> io::Result<PathBuf> {
    let temp_dir = std::env::temp_dir();
    let batch_path = temp_dir.join("create_bannerlord_symlinks.bat");

    let mut batch_file = fs::File::create(&batch_path)?;

    writeln!(batch_file, "@echo off")?;
    writeln!(batch_file, "cd /d \"{}\\Modules\"", game_installation_path)?;

    for (identifier, mod_path, bannerlord_id) in mods {
        writeln!(
            batch_file,
            "if exist \"{}\" rmdir /s /q \"{}\"",
            identifier, identifier
        )?;
        writeln!(
            batch_file,
            "mklink /D \"{}\" \"{}\"",
            bannerlord_id, mod_path
        )?;
    }

    Ok(batch_path)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn start_game_bannerlord(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
    mods: Vec<BannerlordMod>,
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
    let mut symlinked_mods = Vec::new();

    if !mods.is_empty() {
        let mod_ids: Vec<String> = mods
            .iter()
            .map(|mod_info| mod_info.bannerlord_id.clone())
            .collect();

        modules_arg = format!("_MODULES_*{}*_MODULES_", mod_ids.join("*"));

        let custom_mods: Vec<(&str, &str, String)> = mods
            .iter()
            .filter(|mod_info| {
                !mod_info.mod_path.is_empty() && Path::new(&mod_info.mod_path).exists()
            })
            .filter_map(|mod_info| {
                let mod_path = Path::new(&mod_info.mod_path);
                if mod_path.is_dir() {
                    let bannerlord_id = mod_info.bannerlord_id.to_string().clone();
                    Some((
                        mod_info.identifier.as_str(),
                        mod_path.to_str().unwrap(),
                        bannerlord_id,
                    ))
                } else {
                    None
                }
            })
            .collect();

        if !custom_mods.is_empty() {
            let batch_script = create_symlinks_batch_script(&game_installation_path, &custom_mods)
                .map_err(|e| format!("Failed to create symlink batch script: {}", e))?;

            let result = runas::Command::new(batch_script.to_str().unwrap())
                .show(false)
                .force_prompt(true)
                .status();

            let _ = fs::remove_file(batch_script);
            match result {
                Ok(status) if status.success() => {}
                Ok(status) => {
                    return Err(format!("Symlink creation failed. Exit status: {}", status))
                }
                Err(e) => return Err(format!("Failed to create symlinks: {}", e)),
            }

            symlinked_mods.extend(
                custom_mods
                    .iter()
                    .map(|(_, _, bannerlord_id)| bannerlord_id.to_string()),
            );
        }

        if !symlinked_mods.is_empty() {
            let symlinked_mods_str = symlinked_mods.join("*");
            modules_arg.push_str(&format!("*{}*", symlinked_mods_str));
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
