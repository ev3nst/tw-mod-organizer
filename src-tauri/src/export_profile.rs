use std::{fs::File, io::Write};
use tauri::{path::BaseDirectory, Manager};

use crate::utils::create_app_default_paths::create_app_default_paths;

#[tauri::command(rename_all = "snake_case")]
pub async fn export_profile(
    handle: tauri::AppHandle,
    app_id: u32,
    profile_id: u64,
    profile_name: String,
    json_string: String,
) -> Result<String, String> {
    let _ = create_app_default_paths(handle.clone());
    let default_exports_path = handle
        .path()
        .resolve("exports".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let file_name = format!("{}_{}_{}.json", profile_name, app_id, profile_id);
    let file_path = default_exports_path.join(file_name);

    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;

    let formatted_json = serde_json::to_string_pretty(
        &serde_json::from_str::<serde_json::Value>(&json_string)
            .map_err(|e| format!("Invalid JSON string: {}", e))?,
    )
    .map_err(|e| format!("Failed to format JSON: {}", e))?;

    file.write_all(formatted_json.as_bytes())
        .map_err(|e| format!("Failed to write to file: {}", e))?;

    Ok(file_path.to_string_lossy().into_owned())
}
