use std::path::Path;
use std::process::Command;

use crate::create_app_default_paths::create_app_default_paths;

#[tauri::command(rename_all = "snake_case")]
pub fn highlight_path(handle: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let _ = create_app_default_paths(handle);

    let sanitized_path = sanitize_path(&file_path)?;
    let path = Path::new(&sanitized_path);

    let mut command = if path.is_file() {
        let mut cmd = Command::new("explorer");
        cmd.arg("/select,").arg(sanitized_path);
        cmd
    } else if path.is_dir() {
        let mut cmd = Command::new("explorer");
        cmd.arg(sanitized_path);
        cmd
    } else {
        return Err("The provided path is not valid.".to_string());
    };

    command.spawn().map_err(|e| e.to_string())?;

    Ok(())
}

fn sanitize_path(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    let sanitized_path = path
        .to_str()
        .ok_or_else(|| "Invalid file path".to_string())?;
    let safe_path = sanitized_path
        .replace(";", "")
        .replace("&", "")
        .replace("|", "")
        .replace("`", "");
    if safe_path != sanitized_path {
        return Err("Unsafe characters detected in file path.".to_string());
    }

    Ok(safe_path.to_string())
}
