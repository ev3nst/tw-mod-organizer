use std::os::windows::process::CommandExt;
use std::{fs, path::Path, process::Command};
use tokio::time::{sleep, Duration};
use tokio::spawn;

use crate::AppState;
use crate::{steam_paths::steam_paths, supported_games::SUPPORTED_GAMES};

#[tauri::command(rename_all = "snake_case")]
pub async fn start_game(
    app_state: tauri::State<'_, AppState>,
    app_id: u64,
    add_directory_txt: String,
    used_mods_txt: String,
    save_game: Option<String>,
) -> Result<(), String> {
    let steam_state = &app_state.steam_state;
    steam_state.drop_all_clients();

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let game_installation_path =
        match find_game_installation_path(game.steam_folder_name.to_string()) {
            Some(path) => path,
            None => {
                return Err(format!(
                    "Could not find installation path for game with app_id {}",
                    app_id
                ))
            }
        };

    let used_mods_file_path = Path::new(&game_installation_path).join("used_mods.txt");
    fs::write(
        &used_mods_file_path,
        format!("{}{}", add_directory_txt, used_mods_txt),
    )
    .map_err(|e| format!("Failed to write used_mods.txt: {}", e))?;

    let batch_content = format!(
        "start /d \"{}\" {}.exe{}{} used_mods.txt;",
        game_installation_path,
        game.exe_name,
        if let Some(save) = &save_game {
            if !save.is_empty() {
                format!(" game_startup_mode campaign_load \"{}\" ;", save)
            } else {
                String::new()
            }
        } else {
            String::new()
        },
        ""
    );

    let batch_path = Path::new(&game_installation_path).join("launch_game.bat");
    fs::write(&batch_path, batch_content)
        .map_err(|e| format!("Failed to write batch file: {}", e))?;

    Command::new("cmd")
        .creation_flags(0x08000000)
        .args(&["/C", batch_path.to_string_lossy().as_ref()])
        .spawn()
        .map_err(|e| format!("Failed to execute batch file: {}", e))?;

    let batch_path_clone = batch_path.clone();
    spawn(async move {
        sleep(Duration::from_secs(10)).await;
        let _ = fs::remove_file(batch_path_clone);
    });

    Ok(())
}

fn find_game_installation_path(steam_folder_name: String) -> Option<String> {
    match steam_paths() {
        Ok(steam_install_paths) => {
            for steam_install_path in steam_install_paths {
                let library_meta_file = Path::new(&steam_install_path)
                    .join("steamapps")
                    .join("libraryfolders.vdf");

                if !library_meta_file.exists() {
                    continue;
                }

                let file_data = match fs::read_to_string(&library_meta_file) {
                    Ok(data) => data,
                    Err(_) => continue,
                };

                let re = regex::Regex::new(r#""(.*?)""#).unwrap();
                let matches: Vec<&str> = re.find_iter(&file_data).map(|m| m.as_str()).collect();

                let mut library_folder_paths = Vec::new();
                for i in 0..matches.len() {
                    let match_str = matches[i].replace("\"", "");
                    if match_str == "path" && i + 1 < matches.len() {
                        let lib_path = Path::new(&matches[i + 1].replace("\"", ""))
                            .to_str()
                            .unwrap_or("")
                            .to_string();
                        library_folder_paths.push(lib_path.replace("\\\\", "\\"));
                    }
                }

                for lib_path in &library_folder_paths {
                    let game_installation_path = Path::new(lib_path)
                        .join("steamapps")
                        .join("common")
                        .join(&steam_folder_name);

                    if game_installation_path.exists() {
                        return Some(game_installation_path.to_string_lossy().into_owned());
                    }
                }
            }
            None
        }
        Err(_) => None,
    }
}
