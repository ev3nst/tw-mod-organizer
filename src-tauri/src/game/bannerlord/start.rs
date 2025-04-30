use serde::{Deserialize, Serialize};
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;

use crate::game::find_installation_path::find_installation_path;
use crate::game::supported_games::SUPPORTED_GAMES;
use crate::utils::create_junction::create_junction;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BannerlordMod {
    identifier: String,
    bannerlord_id: String,
    mod_path: String,
}

fn create_symlinks_with_elevation(
    game_modules_path: &Path,
    mods: &[(&str, &str, String)],
) -> Result<Vec<String>, String> {
    let mut created_symlinks = Vec::new();
    let mut script_content = String::from(
        "@echo off\r\n\
         NET SESSION >nul 2>&1\r\n\
         IF %ERRORLEVEL% NEQ 0 (\r\n\
             powershell -Command \"$proc = Start-Process -FilePath '%~dpnx0' -Verb RunAs -PassThru -Wait; exit $proc.ExitCode\"\r\n\
             exit /b %ERRORLEVEL%\r\n\
         )\r\n\
         echo Running with elevation...\r\n\r\n"
    );
    let mut needs_elevation = false;

    if let Ok(entries) = fs::read_dir(game_modules_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.read_link().is_ok() {
                if let Err(e) = fs::remove_dir(&path) {
                    return Err(format!("Failed to remove existing symlink: {}", e));
                }
            }
        }
    }

    for (_, mod_path, bannerlord_id) in mods {
        let target_path = Path::new(mod_path);
        let link_path = game_modules_path.join(bannerlord_id);

        if !target_path.exists() {
            continue;
        }

        match create_junction(target_path, &link_path) {
            Ok(true) => {
                created_symlinks.push(bannerlord_id.clone());
                continue;
            }
            Ok(false) => {
                let link_path_str = link_path.to_string_lossy().replace("/", "\\");
                let target_path_str = target_path.to_string_lossy().replace("/", "\\");

                script_content.push_str(&format!(
                    "mklink /D \"{}\" \"{}\"\r\n",
                    link_path_str, target_path_str
                ));

                needs_elevation = true;
                created_symlinks.push(bannerlord_id.clone());
            }
            Err(e) => return Err(format!("Failed to create junction: {}", e)),
        }
    }

    if needs_elevation {
        script_content.push_str("echo Done.\r\n");
        script_content.push_str("exit /b %ERRORLEVEL%\r\n");
        let script_path = std::env::temp_dir().join("bannerlord_symlinks.cmd");

        if let Err(e) = fs::write(&script_path, script_content) {
            return Err(format!("Failed to create script file: {}", e));
        }

        let _ = Command::new("cmd")
            .args(["/C", script_path.to_str().unwrap()])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to execute script: {}", e))?;

        let _ = fs::remove_file(&script_path);
    }

    for bannerlord_id in &created_symlinks {
        let link_path = game_modules_path.join(bannerlord_id);
        if !link_path.exists() {
            return Err(format!(
                "Failed to verify symlink creation for: {}",
                bannerlord_id
            ));
        }
    }

    Ok(created_symlinks)
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

    let game_installation_path = match find_installation_path(game.clone()) {
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
            let game_modules_path = Path::new(&game_installation_path).join("Modules");
            match create_symlinks_with_elevation(&game_modules_path, &custom_mods) {
                Ok(created_mods) => {
                    symlinked_mods = created_mods;
                }
                Err(e) => {
                    return Err(format!("Failed to create symlinks: {}", e));
                }
            }
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
