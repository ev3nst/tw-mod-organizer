use serde::{Deserialize, Serialize};
use std::fs;
use tauri::path::BaseDirectory;
use tauri::Manager;

use futures_util::FutureExt;
use steamworks::{Client, PublishedFileId};

use crate::{steam::workshop_item::workshop::WorkshopItem, AppState};

use super::workshop_item::workshop::WorkshopItemsResult;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkshopCache {
    pub item_ids: Vec<u64>,
    pub items: Vec<WorkshopItem>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_workshop_items(
    handle: tauri::AppHandle,
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
    item_ids: Vec<u64>,
) -> Result<Vec<WorkshopItem>, String> {
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let cache_path = app_cache_dir.join(format!("workshop_cache_{}.json", app_id));
    if cache_path.exists() {
        if let Ok(cache_content) = fs::read_to_string(&cache_path) {
            if let Ok(cache) = serde_json::from_str::<WorkshopCache>(&cache_content) {
                let mut cached_ids = cache.item_ids.clone();
                let mut current_ids = item_ids.clone();
                cached_ids.sort();
                current_ids.sort();

                if cached_ids == current_ids {
                    return Ok(cache.items);
                }
            }
        }
    }

    let steam_state = &app_state.steam_state;
    if !steam_state.has_client(app_id) {
        steam_state.drop_all_clients();
        let (steam_client, single_client) = match Client::init_app(app_id) {
            Ok(result) => result,
            Err(err) => return Err(format!("Failed to initialize Steam client: {}", err)),
        };
        steam_state.set_clients(app_id, steam_client, single_client);
    }

    let steam_client = match steam_state.get_client(app_id) {
        Some(client) => client,
        None => return Err("Failed to get Steam client".to_string()),
    };

    let (tx, mut rx) = tokio::sync::mpsc::channel(32);
    let item_ids_for_query = item_ids.clone();
    let items_task = tokio::task::spawn_blocking(move || {
        let ugc = steam_client.ugc();
        let (tx_inner, rx_inner) = std::sync::mpsc::channel();
        let query_handle = ugc
            .query_items(
                item_ids_for_query
                    .iter()
                    .map(|id| PublishedFileId(*id))
                    .collect(),
            )
            .map_err(|e| format!("Failed to create query handle: {}", e))?;

        query_handle
            .include_children(true)
            .fetch(move |fetch_result| {
                let _ = tx_inner.send(
                    fetch_result
                        .map(|query_results| WorkshopItemsResult::from_query_results(query_results))
                        .map_err(|e| format!("Steam API error: {}", e)),
                );
            });

        let start_time = std::time::Instant::now();
        let timeout_duration = std::time::Duration::from_secs(30);

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

    let mut items_result = None;
    let mut fused_task = items_task.fuse();

    while items_result.is_none() {
        tokio::select! {
            Some(_) = rx.recv() => {
                app_state.steam_state.run_callbacks(app_id)?;
            }
            task_result = &mut fused_task => {
                items_result = Some(
                    task_result.map_err(|e| format!("Task error: {}", e))?
                );
                break;
            }
        }
    }

    let items_result = items_result.unwrap()?;
    let items = items_result
        .items
        .into_iter()
        .filter_map(|item| match item {
            Some(it) if it.file_type == "Community" => Some(it),
            _ => None,
        })
        .collect::<Vec<WorkshopItem>>();

    let new_cache = WorkshopCache {
        item_ids: item_ids.clone(),
        items,
    };
    let _ = fs::write(
        &cache_path,
        serde_json::to_string(&new_cache).map_err(|e| e.to_string())?,
    );

    Ok(new_cache.items)
}
