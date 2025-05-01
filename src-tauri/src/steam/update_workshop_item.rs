use std::sync::{Arc, Mutex};
use std::time::Duration;
use steamworks::{ItemState, PublishedFileId};

use crate::AppState;

use super::initialize_client::initialize_client;

#[tauri::command(rename_all = "snake_case")]
pub async fn update_workshop_item(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
    item_id: u64,
) -> Result<(), String> {
    let steam_client = initialize_client(&app_state, app_id).await?;

    let published_file_id = PublishedFileId(item_id);
    {
        let ugc = steam_client.ugc();
        let state = ugc.item_state(published_file_id);
        if !state.contains(ItemState::SUBSCRIBED) {
            return Err("Workshop item is not subscribed".to_string());
        }

        ugc.download_item(published_file_id, true);
    }

    let timeout = Duration::from_secs(10 * 60); // 10 minutes
    let cancelled = Arc::new(Mutex::new(false));
    let cancelled_clone = cancelled.clone();

    let (tx, rx) = tokio::sync::oneshot::channel();
    std::thread::spawn(move || {
        let start_time = std::time::Instant::now();
        loop {
            if *cancelled_clone.lock().unwrap() {
                let _ = tx.send(Err("Download cancelled".to_string()));
                break;
            }

            if start_time.elapsed() > timeout {
                let _ = tx.send(Err(format!(
                    "Download timeout after {} minutes",
                    timeout.as_secs() / 60
                )));
                break;
            }

            let ugc = steam_client.ugc();
            let state = ugc.item_state(published_file_id);

            if let Some((downloaded, total)) = ugc.item_download_info(published_file_id) {
                if downloaded == total && total > 0 {
                    let _ = tx.send(Ok(()));
                    break;
                }
            }

            if state.contains(ItemState::INSTALLED)
                && state.contains(ItemState::SUBSCRIBED)
                && !state.contains(ItemState::DOWNLOADING)
                && !state.contains(ItemState::DOWNLOAD_PENDING)
            {
                let _ = tx.send(Ok(()));
                break;
            }

            std::thread::sleep(Duration::from_millis(500));
        }
    });

    match rx.await {
        Ok(result) => result,
        Err(_) => {
            *cancelled.lock().unwrap() = true;
            Err("Download monitoring failed unexpectedly".to_string())
        }
    }
}
