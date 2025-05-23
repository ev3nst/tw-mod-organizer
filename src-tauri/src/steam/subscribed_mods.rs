use bincode::{Decode, Encode};
use rayon::prelude::*;
use rustc_hash::{FxHashMap, FxHashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use steamworks::SteamId;
use tauri::Manager;
use tauri::path::BaseDirectory;
use tokio::task::spawn_blocking;

use crate::AppState;
use crate::game::supported_games::SUPPORTED_GAMES;
use crate::r#mod::base_mods::{ModItem, ModVersion};
use crate::r#mod::totalwar;
use crate::xml::submodule_contents::{SubModuleContents, submodule_contents};

use super::fetch_creator_names::fetch_creator_names;
use super::get_workshop_items::get_workshop_items;
use super::initialize_client::initialize_client;
use super::workshop_item::workshop::WorkshopItem;
use super::workshop_path_for_app::workshop_path_for_app;

#[derive(Debug, Clone, Encode, Decode)]
pub struct CachedSubModuleContents {
    pub submodule_info: SubModuleContents,
    pub file_size: u64,
    pub last_modified: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn subscribed_mods(
    handle: tauri::AppHandle,
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
) -> Result<Vec<ModItem>, String> {
    let total_start = Instant::now();
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let t0 = Instant::now();
    let steam_client = initialize_client(&app_state, app_id).await?;
    println!("initialize_client: {}ms", t0.elapsed().as_millis());

    let t1 = Instant::now();
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;
    println!("cache dir check/create: {}ms", t1.elapsed().as_millis());
    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }
    let t2 = Instant::now();
    let subscribed_items: Vec<steamworks::PublishedFileId> = spawn_blocking({
        let steam_client = steam_client.clone();
        move || steam_client.ugc().subscribed_items()
    })
    .await
    .map_err(|e| format!("Failed to fetch subscribed items: {}", e))?;
    println!("fetch subscribed_items: {}ms", t2.elapsed().as_millis());

    let t3 = Instant::now();
    let item_ids: Vec<u64> = subscribed_items.iter().map(|id| id.0).collect();
    if item_ids.is_empty() {
        println!(
            "No subscribed items, total: {}ms",
            total_start.elapsed().as_millis()
        );
        return Ok(Vec::new());
    }
    println!("item_ids collect: {}ms", t3.elapsed().as_millis());
    let t4 = Instant::now();
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
    println!("get_workshop_items: {}ms", t4.elapsed().as_millis());

    if items.is_empty() {
        println!("No items, total: {}ms", total_start.elapsed().as_millis());
        return Ok(Vec::new());
    }

    let t5 = Instant::now();
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
    println!("process items (par_iter): {}ms", t5.elapsed().as_millis());

    let t6 = Instant::now();
    let creator_ids: Vec<_> = mod_items
        .iter()
        .filter_map(|(_, item, _, _, _, _, _)| Some(item.owner.to_steamid()))
        .collect();

    let creator_names =
        fetch_creator_names(steam_client, creator_ids, app_state, app_id, handle).await?;
    println!("fetch_creator_names: {}ms", t6.elapsed().as_millis());

    let t7 = Instant::now();
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
                        .get(&item.owner.to_steamid())
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
    println!("final_mods build: {}ms", t7.elapsed().as_millis());

    println!(
        "subscribed_mods TOTAL: {}ms",
        total_start.elapsed().as_millis()
    );
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
                creator_id = Some(item.owner.to_steamid());
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
            if let Some(submodule_info) = submodule_contents(
                item_path,
                app_cache_dir,
                app_id,
                item.published_file_id.to_string(),
            ) {
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
                creator_id = Some(item.owner.to_steamid());
            }
        }
        _ => {}
    }

    (creator_id, result, mod_map_entry)
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
            .get(&item.owner.to_steamid())
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
