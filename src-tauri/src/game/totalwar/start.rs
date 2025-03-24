use std::os::windows::process::CommandExt;
use std::{fs, path::Path, process::Command};
use tokio::spawn;
use tokio::time::{sleep, Duration};

use crate::game::find_installation_path::find_installation_path;
use crate::game::supported_games::SUPPORTED_GAMES;
use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub async fn start_game_totalwar(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
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
        Path::new(&game_installation_path)
            .join(game.exe_folder.replace("\\", "/"))
            .to_string_lossy()
            .into_owned()
    };

    let used_mods_file_path =
        Path::new(&game_installation_path).join("tw_mod_organizer_used_mods.txt");
    fs::write(
        &used_mods_file_path,
        format!("{}{}", add_directory_txt, used_mods_txt),
    )
    .map_err(|e| format!("Failed to write tw_mod_organizer_used_mods.txt: {}", e))?;

    let batch_content = format!(
        "start /d \"{}\" {}.exe{}{} tw_mod_organizer_used_mods.txt;",
        exe_directory,
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

    let batch_path = Path::new(&exe_directory).join("launch_game.bat");
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
