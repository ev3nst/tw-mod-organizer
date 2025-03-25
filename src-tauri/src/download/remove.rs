use std::sync::atomic::Ordering;

use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_download(
    state: tauri::State<'_, AppState>,
    download_path: String,
    filename: String,
) -> Result<(), String> {
    let download_manager = state.download_manager.lock().await;
    download_manager.is_paused.store(true, Ordering::SeqCst);

    {
        let mut current_download = download_manager.current_download.lock().unwrap();
        if let Some(_task) = current_download.as_ref() {
            *current_download = None;
        }
    }

    download_manager
        .delete_file(&download_path, &filename)
        .map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(())
}
