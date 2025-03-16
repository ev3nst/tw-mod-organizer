use std::{
    os::windows::process::CommandExt,
    process::{Command, Stdio},
};

use crate::utils::supported_games::SUPPORTED_GAMES;

#[tauri::command(rename_all = "snake_case")]
pub async fn is_game_running(app_id: u64) -> Result<bool, String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let output = Command::new("tasklist")
        .creation_flags(0x08000000)
        .arg("/FI")
        .arg(format!("IMAGENAME eq {}.exe", game.exe_name))
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to check if the game is running: {}", e))?;

    if output.status.success() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        Ok(output_str.contains(game.exe_name))
    } else {
        Err("Failed to check running processes".into())
    }
}
