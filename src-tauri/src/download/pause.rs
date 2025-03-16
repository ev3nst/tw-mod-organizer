use std::sync::atomic::Ordering;

use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub async fn pause_download(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let download_manager = state.download_manager.lock().await;
    download_manager.is_paused.store(true, Ordering::SeqCst);

    let mut current_download = download_manager.current_download.lock().unwrap();
    if let Some(task) = current_download.as_mut() {
        task.status = "paused".to_string();
        Ok(())
    } else {
        Err("No active download to pause".to_string())
    }
}
