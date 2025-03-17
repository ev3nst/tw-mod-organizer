use futures_util::FutureExt;
use std::path::PathBuf;
use steamworks::{Client, PublishedFileId};

use crate::pack::find_pack_and_image::find_pack_and_image;
use crate::r#mod::local_mods::{ModItem, Version};
use crate::steam::workshop_item::workshop::WorkshopItemsResult;
use crate::AppState;

use super::workshop_path_for_app::workshop_path_for_app;

#[tauri::command(rename_all = "snake_case")]
pub async fn subscribed_mods(
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
) -> Result<Vec<ModItem>, String> {
    let steam_client = {
        let steam_state = &app_state.steam_state;

        if !steam_state.has_client(app_id) {
            steam_state.drop_all_clients();
            let (steam_client, single_client) = Client::init_app(app_id)
                .map_err(|err| format!("Failed to initialize Steam client: {}", err))?;
            steam_state.set_clients(app_id, steam_client, single_client);
        }

        steam_state
            .get_client(app_id)
            .ok_or_else(|| "Failed to get Steam client".to_string())?
            .clone()
    };

    let steam_client_clone = steam_client.clone();
    let (tx, mut rx) = tokio::sync::mpsc::channel(32);
    let items_task = tokio::task::spawn_blocking(move || {
        let ugc = steam_client.ugc();
        let subscribed_items = ugc.subscribed_items();

        let item_ids: Vec<u64> = subscribed_items.iter().map(|id| id.0).collect();
        if item_ids.is_empty() {
            return Ok(WorkshopItemsResult {
                items: Vec::new(),
                was_cached: false,
            });
        }

        let (tx_inner, rx_inner) = std::sync::mpsc::channel();
        let query_handle = ugc
            .query_items(item_ids.iter().map(|id| PublishedFileId(*id)).collect())
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
    let workshop_base_path = workshop_path_for_app(app_id);

    let mut mod_items = Vec::new();
    let mut creator_ids = Vec::new();

    let steam_client_for_friends = steam_client_clone.clone();
    let (creator_tx, mut creator_rx) = tokio::sync::mpsc::channel(32);

    for item in items_result.items.into_iter().flatten() {
        if let Some(ref base_path) = workshop_base_path {
            let item_path = PathBuf::from(base_path).join(&item.published_file_id.to_string());
            let (pack_file, pack_file_path, preview_local) = find_pack_and_image(&item_path);

            if !pack_file.is_empty() {
                let required_items = item.required_items.clone();
                creator_ids.push(item.owner.raw);
                mod_items.push((
                    item,
                    pack_file,
                    pack_file_path,
                    preview_local,
                    required_items,
                ));
            }
        }
    }

    let creator_names = if !mod_items.is_empty() {
        let creator_task = tokio::task::spawn_blocking(move || {
            let friends = steam_client_for_friends.friends();
            let mut unknown_creators = std::collections::HashSet::new();

            let unique_creator_ids: std::collections::HashSet<_> =
                creator_ids.iter().cloned().collect();

            for &creator_id in &unique_creator_ids {
                let creator = friends.get_friend(creator_id);
                if creator.name() == "[unknown]" {
                    unknown_creators.insert(creator_id);
                    let _ = friends.request_user_information(creator_id, true);
                }
            }

            if !unknown_creators.is_empty() {
                let start_time = std::time::Instant::now();
                let timeout = std::time::Duration::from_secs(3);

                while !unknown_creators.is_empty() && start_time.elapsed() < timeout {
                    let _ = creator_tx.blocking_send(());
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    unknown_creators.retain(|&id| {
                        let creator = friends.get_friend(id);
                        creator.name() == "[unknown]"
                    });
                }
            }

            let mut names = std::collections::HashMap::new();
            for &id in &creator_ids {
                let creator = friends.get_friend(id);
                names.insert(id, creator.name());
            }

            names
        });

        let mut creator_result = None;
        let mut fused_creator_task = creator_task.fuse();

        while creator_result.is_none() {
            tokio::select! {
                Some(_) = creator_rx.recv() => {
                    app_state.steam_state.run_callbacks(app_id)?;
                }
                task_result = &mut fused_creator_task => {
                    creator_result = Some(
                        task_result.map_err(|e| format!("Creator task error: {}", e))?
                    );
                    break;
                }
            }
        }

        creator_result.unwrap()
    } else {
        std::collections::HashMap::new()
    };

    let mut mods = Vec::new();
    for (item, pack_file, pack_file_path, preview_local, required_items) in mod_items {
        let creator_name = creator_names
            .get(&item.owner.raw)
            .cloned()
            .unwrap_or_else(|| "[unknown]".to_string());

        mods.push(ModItem {
            identifier: item.published_file_id.to_string(),
            title: item.title,
            description: Some(item.description),
            created_at: item.time_created,
            categories: Some(item.tags),
            url: Some(item.url),
            preview_url: item.preview_url,
            version: Some(Version::Number(item.time_updated)),
            item_type: "steam_mod".to_string(),
            pack_file,
            pack_file_path,
            preview_local,
            creator_id: Some(item.owner.steam_id64.to_string()),
            creator_name: Some(creator_name),
            required_items: required_items.iter().map(|id| id.to_string()).collect(),
        });
    }

    Ok(mods)
}
