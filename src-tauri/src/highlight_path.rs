use std::fs::canonicalize;
use std::path::Path;
use std::process::Command;

use crate::create_app_default_paths::create_app_default_paths;

#[tauri::command(rename_all = "snake_case")]
pub fn highlight_path(handle: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let _ = create_app_default_paths(handle);

    let absolute_path = sanitize_and_resolve_path(&file_path)?;
    let path = Path::new(&absolute_path);

    let mut command = Command::new("explorer");
    if path.is_file() {
        command.arg("/select,").arg(absolute_path);
    } else if path.is_dir() {
        command.arg(absolute_path);
    } else {
        return Err("The provided path is not valid.".to_string());
    }

    command
        .spawn()
        .map_err(|e| format!("Failed to open explorer: {}", e))?;

    Ok(())
}

fn sanitize_and_resolve_path(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);

    let absolute_path =
        canonicalize(path).map_err(|_| "Invalid or non-existent file path.".to_string())?;

    let path_str = absolute_path
        .to_str()
        .ok_or_else(|| "Failed to convert path to valid UTF-8.".to_string())?;

    Ok(path_str.to_string())
}
