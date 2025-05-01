use futures_util::FutureExt;
use serde::Serialize;
use steamworks::PublishedFileId;
use tokio::sync::mpsc;

use crate::AppState;

use super::initialize_client::initialize_client;

#[derive(Debug, Serialize)]
pub struct DownloadInfo {
    pub is_downloading: bool,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub progress_percentage: f32,
    pub download_complete: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn check_item_download(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
    item_id: u64,
) -> Result<DownloadInfo, String> {
    let steam_client = initialize_client(&app_state, app_id).await?;

    let (tx, mut rx) = mpsc::channel(32);

    let download_task = tokio::task::spawn_blocking(move || {
        let ugc = steam_client.ugc();
        let item = PublishedFileId(item_id);

        let (tx_inner, rx_inner) = std::sync::mpsc::channel();

        let start_time = std::time::Instant::now();
        let timeout_duration = std::time::Duration::from_secs(30);

        let state = ugc.item_state(item);
        let is_installed = state.contains(steamworks::ItemState::INSTALLED);
        let is_downloading = state.contains(steamworks::ItemState::DOWNLOADING);
        let needs_update = state.contains(steamworks::ItemState::NEEDS_UPDATE);

        if is_installed && !needs_update {
            let _ = tx_inner.send(Ok(DownloadInfo {
                is_downloading: false,
                downloaded_bytes: ugc.item_install_info(item).unwrap().size_on_disk,
                total_bytes: ugc.item_install_info(item).unwrap().size_on_disk,
                progress_percentage: 100.0,
                download_complete: true,
            }));
        } else if is_downloading {
            if let Some((bytes_downloaded, bytes_total)) = ugc.item_download_info(item) {
                let progress = if bytes_total > 0 {
                    (bytes_downloaded as f32 / bytes_total as f32) * 100.0
                } else {
                    0.0
                };

                let _ = tx_inner.send(Ok(DownloadInfo {
                    is_downloading: true,
                    downloaded_bytes: bytes_downloaded,
                    total_bytes: bytes_total,
                    progress_percentage: progress,
                    download_complete: false,
                }));
            }
        } else {
            let _ = tx_inner.send(Ok(DownloadInfo {
                is_downloading: false,
                downloaded_bytes: 0,
                total_bytes: 0,
                progress_percentage: 0.0,
                download_complete: false,
            }));
        }

        loop {
            let _ = tx.blocking_send(());
            if let Ok(result) = rx_inner.try_recv() {
                return result;
            }

            if start_time.elapsed() > timeout_duration {
                return Err("Operation timed out waiting for Steam response".to_string());
            }

            std::thread::sleep(std::time::Duration::from_millis(10));
        }
    });

    let mut download_result = None;
    let mut fused_task = download_task.fuse();

    while download_result.is_none() {
        tokio::select! {
            Some(_) = rx.recv() => {
                app_state.steam_state.run_callbacks(app_id)?;
            }
            task_result = &mut fused_task => {
                download_result = Some(task_result.map_err(|e| format!("Task error: {}", e))??);
            }
        }
    }

    Ok(download_result.unwrap())
}
