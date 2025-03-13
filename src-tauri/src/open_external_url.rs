use std::{os::windows::process::CommandExt, process::Command};

#[tauri::command(rename_all = "snake_case")]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Invalid URL: must start with http:// or https://".to_string());
    }

    Command::new("cmd")
        .creation_flags(0x08000000)
        .args(&["/C", "start", "", &url])
        .spawn()
        .map_err(|e| format!("Failed to open URL: {}", e))?;

    Ok(())
}
