use std::{
    os::windows::process::CommandExt,
    process::{Command, Stdio},
};

use super::supported_games::SUPPORTED_GAMES;

#[tauri::command(rename_all = "snake_case")]
pub async fn force_quit(app_id: u32) -> Result<(), String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let output = Command::new("taskkill")
        .creation_flags(0x08000000)
        .args(["/F", "/IM", &format!("{}.exe", game.exe_name)])
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to force quit the game: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to force quit the game: {}", error))
    }
}
