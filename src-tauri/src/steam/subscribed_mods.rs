use futures_util::FutureExt;
use rayon::prelude::*;
use rustc_hash::{FxHashMap, FxHashSet};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use steamworks::SteamId;
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
use super::workshop_item::workshop::WorkshopItem;
use super::workshop_path_for_app::workshop_path_for_app;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedSubModuleContents {
    submodule_info: SubModuleContents,
    file_size: u64,
    last_modified: u64,
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

    let items_future = get_workshop_items(handle.clone(), app_state.clone(), app_id, item_ids);

    let workshop_base_path = match workshop_path_for_app(app_id) {
        Some(path) => path,
        None => return Ok(Vec::new()),
    };

    let items_result = items_future.await;
    let items = match items_result {
        Ok(items) => items,
        Err(e) => return Err(e),
    };

    if items.is_empty() {
        return Ok(Vec::new());
    }

    let items = Arc::new(items);
    let game = Arc::new(game.clone());
    let workshop_base_path = Arc::new(workshop_base_path);
    let app_cache_dir = Arc::new(app_cache_dir);

    let (mod_items, mod_contents_map): (Vec<_>, FxHashMap<_, _>) = {
        let items_clone = items.clone();
        let game_clone = game.clone();
        let workshop_path_clone = workshop_base_path.clone();
        let cache_dir_clone = app_cache_dir.clone();
        let app_id = app_id;

        spawn_blocking(move || {
            let results: Vec<_> = items_clone
                .par_iter()
                .filter_map(|item| {
                    let item_path = PathBuf::from(&*workshop_path_clone)
                        .join(&item.published_file_id.to_string());

                    let result = process_item(
                        &game_clone.r#type,
                        item,
                        &item_path,
                        &cache_dir_clone,
                        app_id,
                    );

                    if let (Some(creator_id), result_info, mod_map_entry) = result {
                        Some((creator_id, result_info, mod_map_entry))
                    } else {
                        None
                    }
                })
                .collect();

            let mut steam_items = Vec::with_capacity(results.len());
            let mut mod_contents = FxHashMap::default();
            let mut creator_set = FxHashSet::default();

            for (creator_id, item_tuple, mod_map_entry) in results {
                creator_set.insert(creator_id);

                if let Some((id, entry)) = mod_map_entry {
                    mod_contents.insert(id, entry);
                }

                if let Some(item) = item_tuple {
                    steam_items.push(item);
                }
            }

            (steam_items, mod_contents)
        })
        .await
        .unwrap_or_else(|_| (Vec::new(), FxHashMap::default()))
    };

    let creator_ids: Vec<_> = mod_items
        .iter()
        .filter_map(|(_, item, _, _, _, _, _)| Some(item.owner.raw))
        .collect();

    let creator_names = fetch_creator_names(steam_client, creator_ids, app_state, app_id).await?;

    let final_mods = if game.r#type == "bannerlord" {
        process_bannerlord_dependencies(mod_items, &mod_contents_map, creator_names)
    } else {
        mod_items
            .into_iter()
            .map(
                |(
                    game_specific_id,
                    item,
                    mod_file,
                    mod_file_path,
                    preview_local,
                    required_items,
                    child_mods,
                )| {
                    let creator_name = creator_names
                        .get(&item.owner.raw)
                        .cloned()
                        .unwrap_or_else(|| "[unknown]".to_string());

                    ModItem {
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
                    }
                },
            )
            .collect()
    };

    Ok(final_mods)
}

fn process_item(
    game_type: &str,
    item: &WorkshopItem,
    item_path: &PathBuf,
    app_cache_dir: &PathBuf,
    app_id: u32,
) -> (
    Option<SteamId>,
    Option<(
        String,
        WorkshopItem,
        String,
        String,
        String,
        Vec<String>,
        Vec<String>,
    )>,
    Option<(String, (SubModuleContents, String))>,
) {
    let mut creator_id = None;
    let mut result = None;
    let mut mod_map_entry = None;

    match game_type {
        "totalwar" => {
            let (mod_file, mod_file_path, preview_local) =
                totalwar::find_mod_file_and_image::find_mod_file_and_image(item_path);

            if !mod_file.is_empty() {
                let required_items = item
                    .required_items
                    .iter()
                    .map(|id| id.to_string())
                    .collect::<Vec<_>>();
                creator_id = Some(item.owner.raw);
                result = Some((
                    String::from(""),
                    item.clone(),
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
                "workshop_item_{}_{}_contents.bin",
                app_id, item.published_file_id
            );
            let cache_file = app_cache_dir.join(cache_json_filename);

            if let Some(submodule_info) = try_load_cached_info(&submodule_path, &cache_file) {
                result = Some((
                    submodule_info.id.clone(),
                    item.clone(),
                    submodule_info.name.clone(),
                    item_path.to_string_lossy().to_string(),
                    String::from(""),
                    Vec::<String>::new(),
                    Vec::<String>::new(),
                ));
                mod_map_entry = Some((
                    submodule_info.id.clone(),
                    (submodule_info.clone(), item.published_file_id.to_string()),
                ));
                creator_id = Some(item.owner.raw);
            } else if let Some(submodule_info) = submodule_contents(item_path) {
                if let Ok(metadata) = fs::metadata(&submodule_path) {
                    let file_size = metadata.len();
                    let last_modified = metadata
                        .modified()
                        .map(|time| {
                            time.duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs()
                        })
                        .unwrap_or(0);

                    let cache_data = CachedSubModuleContents {
                        submodule_info: submodule_info.clone(),
                        file_size,
                        last_modified,
                    };

                    if let Ok(data) = bincode::serialize(&cache_data) {
                        let _ = fs::write(&cache_file, data);
                    }
                }

                result = Some((
                    submodule_info.id.clone(),
                    item.clone(),
                    submodule_info.name.clone(),
                    item_path.to_string_lossy().to_string(),
                    String::from(""),
                    Vec::<String>::new(),
                    Vec::<String>::new(),
                ));

                mod_map_entry = Some((
                    submodule_info.id.clone(),
                    (submodule_info.clone(), item.published_file_id.to_string()),
                ));

                creator_id = Some(item.owner.raw);
            }
        }
        _ => {}
    }

    (creator_id, result, mod_map_entry)
}

fn try_load_cached_info(
    submodule_path: &PathBuf,
    cache_file: &PathBuf,
) -> Option<SubModuleContents> {
    if !cache_file.exists() {
        return None;
    }

    let metadata = fs::metadata(submodule_path).ok()?;
    let file_size = metadata.len();
    let last_modified = metadata
        .modified()
        .map(|time| {
            time.duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        })
        .unwrap_or(0);

    let cache_data = fs::read(cache_file).ok()?;
    let cached: CachedSubModuleContents = bincode::deserialize(&cache_data).ok()?;

    if cached.file_size == file_size && cached.last_modified == last_modified {
        return Some(cached.submodule_info);
    }

    None
}

async fn fetch_creator_names(
    steam_client: steamworks::Client,
    creator_ids: Vec<SteamId>,
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
) -> Result<FxHashMap<SteamId, String>, String> {
    if creator_ids.is_empty() {
        return Ok(FxHashMap::default());
    }

    let (creator_tx, mut creator_rx) = tokio::sync::mpsc::channel(32);

    let creator_task = tokio::task::spawn_blocking(move || {
        let friends = steam_client.friends();
        let mut unknown_creators = FxHashSet::default();

        let unique_creator_ids: FxHashSet<_> = creator_ids.into_iter().collect();

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

    Ok(creator_result.unwrap())
}

fn process_bannerlord_dependencies(
    mod_items: Vec<(
        String,
        WorkshopItem,
        String,
        String,
        String,
        Vec<String>,
        Vec<String>,
    )>,
    mod_contents_map: &FxHashMap<String, (SubModuleContents, String)>,
    creator_names: FxHashMap<SteamId, String>,
) -> Vec<ModItem> {
    let mut mods = Vec::with_capacity(mod_items.len());

    for (
        game_specific_id,
        item,
        mod_file,
        mod_file_path,
        preview_local,
        mut required_items,
        mut child_mods,
    ) in mod_items
    {
        let item_id = item.published_file_id.to_string();

        if let Some(module_id) = mod_contents_map
            .iter()
            .find(|(_, (_, pub_id))| *pub_id == item_id)
            .map(|(id, _)| id.clone())
        {
            if let Some((submodule_info, _)) = mod_contents_map.get(&module_id) {
                if let Some(ref depended_modules) = submodule_info.depended_modules {
                    for dep in depended_modules {
                        if let Some((_, pub_id)) = mod_contents_map.get(&dep.id) {
                            required_items.push(pub_id.clone());
                        } else {
                            required_items.push(dep.id.clone());
                        }
                    }
                }

                if let Some(ref modules_to_load_after) = submodule_info.modules_to_load_after_this {
                    for child in modules_to_load_after {
                        if let Some((_, pub_id)) = mod_contents_map.get(&child.id) {
                            child_mods.push(pub_id.clone());
                        } else {
                            child_mods.push(child.id.clone());
                        }
                    }
                }
            }
        }

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

    mods
}
