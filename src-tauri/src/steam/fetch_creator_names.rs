use crate::AppState;
use bincode::{Decode, Encode};
use futures_util::FutureExt;
use rustc_hash::{FxHashMap, FxHashSet};
use std::fs;
use steamworks::SteamId;
use tauri::Manager;
use tauri::path::BaseDirectory;

#[derive(Debug, Encode, Decode)]
struct CreatorNameCache {
    names: FxHashMap<u64, String>,
}

pub async fn fetch_creator_names(
    steam_client: steamworks::Client,
    creator_ids: Vec<SteamId>,
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
    handle: tauri::AppHandle,
) -> Result<FxHashMap<SteamId, String>, String> {
    if creator_ids.is_empty() {
        return Ok(FxHashMap::default());
    }

    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;
    let cache_path = app_cache_dir.join(format!("creator_names_cache_{}.bin", app_id));
    let bincode_config = bincode::config::standard();

    let mut cached_names: FxHashMap<u64, String> = FxHashMap::default();
    if cache_path.exists() {
        if let Ok(cache_content) = fs::read(&cache_path) {
            if let Ok((cache_entry, _)) =
                bincode::decode_from_slice::<CreatorNameCache, _>(&cache_content, bincode_config)
            {
                cached_names = cache_entry.names;
            }
        }
    }
    let ids_to_fetch: Vec<SteamId> = creator_ids
        .iter()
        .filter(|id| !cached_names.contains_key(&id.raw()))
        .cloned()
        .collect();

    if ids_to_fetch.is_empty() {
        return Ok(creator_ids
            .into_iter()
            .map(|id| (id, cached_names[&id.raw()].clone()))
            .collect());
    }

    let (creator_tx, mut creator_rx) = tokio::sync::mpsc::channel(32);

    let creator_task = tokio::task::spawn_blocking({
        let ids_to_fetch = ids_to_fetch.clone();
        move || {
            let friends = steam_client.friends();
            let mut unknown_creators = FxHashSet::default();

            let unique_creator_ids: FxHashSet<_> = ids_to_fetch.into_iter().collect();

            for &creator_id in &unique_creator_ids {
                let creator = friends.get_friend(creator_id);
                if creator.name() == "[unknown]" {
                    unknown_creators.insert(creator_id);
                    let _ = friends.request_user_information(creator_id, true);
                }
            }

            if !unknown_creators.is_empty() {
                let start_time = std::time::Instant::now();
                let timeout = std::time::Duration::from_secs(2);

                while !unknown_creators.is_empty() && start_time.elapsed() < timeout {
                    let _ = creator_tx.blocking_send(());
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    unknown_creators.retain(|&id| {
                        let creator = friends.get_friend(id);
                        creator.name() == "[unknown]"
                    });
                }
            }

            let mut names = FxHashMap::default();
            for &id in &unique_creator_ids {
                let creator = friends.get_friend(id);
                names.insert(id, creator.name());
            }

            names
        }
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

    let fetched_names = creator_result.unwrap();

    cached_names.extend(
        fetched_names
            .iter()
            .map(|(id, name)| (id.raw(), name.clone())),
    );
    let cache_struct = CreatorNameCache {
        names: cached_names.clone(),
    };
    let serialized_cache = bincode::encode_to_vec(&cache_struct, bincode_config)
        .map_err(|e| format!("Failed to serialize creator name cache: {}", e))?;
    let _ = fs::write(&cache_path, serialized_cache);

    let result = creator_ids
        .into_iter()
        .filter_map(|id| cached_names.get(&id.raw()).map(|name| (id, name.clone())))
        .collect();

    Ok(result)
}
