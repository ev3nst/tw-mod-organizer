use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_download(
    state: tauri::State<'_, AppState>,
    download_path: String,
    filename: String,
) -> Result<(), String> {
    let download_manager = state.download_manager.lock().await;

    {
        let mut current_download = download_manager.current_download.lock().unwrap();
        *current_download = None;
    }

    download_manager
        .delete_file(&download_path, &filename)
        .map_err(|e| format!("Failed to delete file: {}", e))
}
