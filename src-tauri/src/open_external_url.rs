use std::{os::windows::process::CommandExt, process::Command};

#[tauri::command(rename_all = "snake_case")]
pub fn open_external_url(url: String) -> Result<(), String> {
    Command::new("powershell")
        .creation_flags(0x08000000)
        .arg("-Command")
        .arg(format!("Start-Process '{}'", &url))
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
