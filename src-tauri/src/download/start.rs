use std::sync::atomic::Ordering;

use crate::AppState;
use crate::utils::create_app_default_paths::create_app_default_paths;

use super::manager::{DownloadManager, DownloadTask};

#[tauri::command(rename_all = "snake_case")]
pub async fn start_download(
    handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    task: DownloadTask,
) -> Result<(), String> {
    let _ = create_app_default_paths(handle.clone());

    let download_manager = state.download_manager.lock().await;
    download_manager.is_paused.store(false, Ordering::SeqCst);

    {
        let mut current_download = download_manager
            .current_download
            .lock()
            .map_err(|_| "Failed to lock current download".to_string())?;
        *current_download = Some(task.clone());
    }

    let client = download_manager.client.clone();
    let handle_clone = handle.clone();
    let mut task_clone = task.clone();
    let current_download = download_manager.current_download.clone();
    let is_paused = download_manager.is_paused.clone();

    tokio::spawn(async move {
        match DownloadManager::download_single_file(
            &client,
            handle_clone,
            &mut task_clone,
            is_paused,
        )
        .await
        {
            Ok(final_status) => {
                if let Ok(mut current_download) = current_download.lock() {
                    if let Some(current_task) = current_download.as_mut() {
                        current_task.status = final_status;
                    }
                }
            }
            Err(e) => {
                eprintln!("Download error: {:?}", e);
            }
        }
    });

    Ok(())
}
