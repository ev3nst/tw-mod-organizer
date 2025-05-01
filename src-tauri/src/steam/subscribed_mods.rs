use futures_util::FutureExt;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager;
use tokio::task::spawn_blocking;

use crate::game::supported_games::SUPPORTED_GAMES;
use crate::r#mod::base_mods::{ModItem, ModVersion};
use crate::r#mod::totalwar;
use crate::xml::submodule_contents::{submodule_contents, SubModuleContents};
use crate::AppState;

use super::get_workshop_items::get_workshop_items;
use super::initialize_client::initialize_client;
use super::workshop_path_for_app::workshop_path_for_app;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedSubModuleContents {
    submodule_info: SubModuleContents,
    file_size: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn subscribed_mods(
    handle: tauri::AppHandle,
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
) -> Result<Vec<ModItem>, String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let steam_client = initialize_client(&app_state, app_id).await?;
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let subscribed_items: Vec<steamworks::PublishedFileId> = spawn_blocking({
        let steam_client = steam_client.clone();
        move || steam_client.ugc().subscribed_items()
    })
    .await
    .map_err(|e| format!("Failed to fetch subscribed items: {}", e))?;

    let item_ids: Vec<u64> = subscribed_items.iter().map(|id| id.0).collect();
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }

    let items_result = get_workshop_items(handle, app_state.clone(), app_id, item_ids).await;
    let workshop_base_path = workshop_path_for_app(app_id);

    let mut creator_ids = Vec::new();
    let mut steam_items = Vec::new();
    let mut mod_contents_map = HashMap::new();

    let steam_client_clone = steam_client.clone();
    let steam_client_for_friends = steam_client_clone.clone();
    let (creator_tx, mut creator_rx) = tokio::sync::mpsc::channel(32);

    if let Some(ref base_path) = workshop_base_path {
        for item in items_result.into_iter().flatten() {
            creator_ids.push(item.owner.raw);

            let item_path = PathBuf::from(base_path).join(&item.published_file_id.to_string());

            match game.r#type.as_ref() {
                "totalwar" => {
                    let (mod_file, mod_file_path, preview_local) =
                        totalwar::find_mod_file_and_image::find_mod_file_and_image(&item_path);

                    if !mod_file.is_empty() {
                        let required_items = item
                            .required_items
                            .iter()
                            .map(|id| id.to_string())
                            .collect();
                        steam_items.push((
                            String::from(""),
                            item,
                            mod_file,
                            mod_file_path,
                            preview_local,
                            required_items,
                            Vec::<String>::new(),
                        ));
                    }
                }
                "bannerlord" => {
                    let submodule_path = item_path.join("SubModule.xml");
                    let cache_json_filename = format!(
                        "workshop_item_{}_{}_contents.json",
                        app_id, item.published_file_id
                    );
                    let cache_file = app_cache_dir.join(cache_json_filename);
                    let mut use_cache = false;
                    let mut cached_info: Option<CachedSubModuleContents> = None;

                    if cache_file.exists() {
                        if let Ok(metadata) = fs::metadata(&submodule_path) {
                            let file_size = metadata.len();
                            if let Ok(mut file) = fs::File::open(&cache_file) {
                                let mut contents = String::new();
                                if file.read_to_string(&mut contents).is_ok() {
                                    if let Ok(parsed_cache) =
                                        serde_json::from_str::<CachedSubModuleContents>(&contents)
                                    {
                                        if parsed_cache.file_size == file_size {
                                            use_cache = true;
                                            cached_info = Some(parsed_cache);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if use_cache {
                        if let Some(cached) = cached_info {
                            mod_contents_map.insert(
                                cached.submodule_info.id.clone(),
                                (
                                    cached.submodule_info.clone(),
                                    item.published_file_id.to_string(),
                                ),
                            );
                            steam_items.push((
                                cached.submodule_info.id,
                                item,
                                cached.submodule_info.name,
                                item_path.to_string_lossy().to_string(),
                                String::from(""),
                                Vec::<String>::new(),
                                Vec::<String>::new(),
                            ));
                            continue;
                        }
                    }

                    if let Some(submodule_info) = submodule_contents(&item_path) {
                        if let Ok(metadata) = fs::metadata(&submodule_path) {
                            let file_size = metadata.len();
                            let cache_data = CachedSubModuleContents {
                                submodule_info: submodule_info.clone(),
                                file_size,
                            };
                            if let Ok(mut file) = fs::File::create(&cache_file) {
                                let _ = file.write_all(
                                    serde_json::to_string(&cache_data).unwrap().as_bytes(),
                                );
                            }
                        }
                        mod_contents_map.insert(
                            submodule_info.id.clone(),
                            (submodule_info.clone(), item.published_file_id.to_string()),
                        );
                        steam_items.push((
                            submodule_info.id,
                            item,
                            submodule_info.name,
                            item_path.to_string_lossy().to_string(),
                            String::from(""),
                            Vec::<String>::new(),
                            Vec::<String>::new(),
                        ));
                    }
                }
                _ => return Err(format!("Game type '{}' is not supported", game.r#type)),
            }
        }
    } else {
        return Ok(Vec::new());
    }

    if game.r#type == "bannerlord" {
        for item_data in &mut steam_items {
            let item_id = item_data.1.published_file_id.to_string();

            if let Some(module_id) = mod_contents_map
                .iter()
                .find(|(_, (_, pub_id))| *pub_id == item_id)
                .map(|(id, _)| id.clone())
            {
                if let Some((submodule_info, _)) = mod_contents_map.get(&module_id) {
                    if let Some(ref depended_modules) = submodule_info.depended_modules {
                        for dep in depended_modules {
                            if let Some((_, pub_id)) = mod_contents_map.get(&dep.id) {
                                item_data.5.push(pub_id.clone());
                            } else {
                                item_data.5.push(dep.id.clone());
                            }
                        }
                    }

                    if let Some(ref modules_to_load_after) =
                        submodule_info.modules_to_load_after_this
                    {
                        for child in modules_to_load_after {
                            if let Some((_, pub_id)) = mod_contents_map.get(&child.id) {
                                item_data.6.push(pub_id.clone());
                            } else {
                                item_data.6.push(child.id.clone());
                            }
                        }
                    }
                }
            }
        }
    }

    let creator_names = if !steam_items.is_empty() {
        let creator_task = tokio::task::spawn_blocking(move || {
            let friends = steam_client_for_friends.friends();
            let mut unknown_creators = HashSet::new();

            let unique_creator_ids: HashSet<_> = creator_ids.iter().cloned().collect();

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

            let mut names = HashMap::new();
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
        HashMap::new()
    };

    let mut mods = Vec::new();
    for (
        game_specific_id,
        item,
        mod_file,
        mod_file_path,
        preview_local,
        required_items,
        child_mods,
    ) in steam_items
    {
        let creator_name = creator_names
            .get(&item.owner.raw)
            .cloned()
            .unwrap_or_else(|| "[unknown]".to_string());

        mods.push(ModItem {
            game_specific_id,
            identifier: item.published_file_id.to_string(),
            title: item.title,
            description: Some(item.description),
            created_at: item.time_created,
            categories: Some(item.tags),
            url: Some(item.url),
            download_url: Some("".to_string()),
            preview_url: item.preview_url,
            version: Some(ModVersion::Number(item.time_updated)),
            updated_at: Some(item.time_updated),
            item_type: "steam_mod".to_string(),
            mod_file,
            mod_file_path,
            preview_local,
            creator_id: Some(item.owner.steam_id64.to_string()),
            creator_name: Some(creator_name),
            required_items,
            child_mods,
        });
    }

    Ok(mods)
}
