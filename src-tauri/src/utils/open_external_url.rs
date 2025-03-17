use open;

#[tauri::command(rename_all = "snake_case")]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://") || url.starts_with("steam://")) {
        return Err("Invalid URL: must start with http://, https://, or steam://".to_string());
    }

    open::that(url).map_err(|e| format!("Failed to open URL: {}", e))
}
