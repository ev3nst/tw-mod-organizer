use crate::steamworks::client;
use steamworks::{Client, PublishedFileId};
use tokio::sync::oneshot;

#[tauri::command(rename_all = "snake_case")]
pub async fn unsubscribe(app_id: u32, item_id: u64) -> Result<bool, String> {
    if !client::has_client(app_id) {
        let steam_client = match Client::init_app(app_id) {
            Ok(result) => result,
            Err(err) => return Err(format!("Failed to initialize Steam client: {}", err)),
        };
        client::set_client(app_id, steam_client);
    }

    let steam_client = match client::get_client(app_id) {
        Some(client) => client,
        None => return Err("Failed to get Steam client".to_string()),
    };

    let unsub_result = tokio::task::spawn_blocking(move || {
        let (tx, mut rx) = oneshot::channel();
        steam_client
            .ugc()
            .unsubscribe_item(PublishedFileId(item_id), move |result| {
                let _ = tx.send(result);
            });

        let start_time = std::time::Instant::now();
        let timeout_duration = std::time::Duration::from_secs(30);
        loop {
            steam_client.run_callbacks();
            if let Ok(result) = rx.try_recv() {
                return result.map_err(|e| format!("Steam API error: {}", e));
            }

            if start_time.elapsed() > timeout_duration {
                return Err("Operation timed out waiting for Steam response".to_string());
            }

            std::thread::sleep(std::time::Duration::from_millis(10));
        }
    })
    .await;

    match unsub_result {
        Ok(Ok(())) => Ok(true),
        Ok(Err(e)) => Err(e),
        Err(e) => Err(format!("Task join error: {}", e)),
    }
}
