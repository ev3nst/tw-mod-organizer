use std::fs;
use std::path::{Path, PathBuf};
use steamworks::{Client, PublishedFileId};

use crate::local_mods::{ModItem, Version};
use crate::steam_paths::steam_paths;
use crate::steamworks::{client, workshop_item::workshop::WorkshopItemsResult};

fn find_workshop_path_for_app(app_id: u32) -> Option<String> {
    match steam_paths() {
        Ok(steam_install_paths) => {
            for steam_install_path in steam_install_paths {
                let library_meta_file = Path::new(&steam_install_path)
                    .join("steamapps")
                    .join("libraryfolders.vdf");

                if !library_meta_file.exists() {
                    continue;
                }

                let file_data = match fs::read_to_string(&library_meta_file) {
                    Ok(data) => data,
                    Err(_) => continue,
                };

                let re = regex::Regex::new(r#""(.*?)""#).unwrap();
                let matches: Vec<&str> = re.find_iter(&file_data).map(|m| m.as_str()).collect();

                let mut library_folder_paths = Vec::new();
                for i in 0..matches.len() {
                    let match_str = matches[i].replace("\"", "");
                    if match_str == "path" && i + 1 < matches.len() {
                        let lib_path = Path::new(&matches[i + 1].replace("\"", ""))
                            .to_str()
                            .unwrap_or("")
                            .to_string();
                        library_folder_paths.push(lib_path.replace("\\\\", "\\"));
                    }
                }

                for lib_path in &library_folder_paths {
                    let workshop_path = Path::new(lib_path)
                        .join("steamapps")
                        .join("workshop")
                        .join("content")
                        .join(app_id.to_string());

                    if workshop_path.exists() {
                        return Some(workshop_path.to_string_lossy().into_owned());
                    }
                }
            }
            None
        }
        Err(_) => None,
    }
}

fn find_pack_and_image(dir_path: &Path) -> (String, String, String) {
    if !dir_path.exists() {
        return (String::new(), String::new(), String::new());
    }

    let mut pack_file = (String::new(), String::new());
    let mut image_file = String::new();

    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_file() {
                if path.extension().map_or(false, |ext| ext == "pack") {
                    pack_file = (
                        path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string(),
                        path.to_string_lossy().to_string(),
                    );
                }
                if image_file.is_empty()
                    && path
                        .extension()
                        .map_or(false, |ext| matches!(ext.to_str(), Some("jpg" | "png")))
                {
                    image_file = path.to_string_lossy().to_string();
                }
            }

            if !pack_file.0.is_empty() && !image_file.is_empty() {
                break;
            }
        }
    }

    (pack_file.0, pack_file.1, image_file)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn subscribed_mods(app_id: u32) -> Result<Vec<ModItem>, String> {
    if !client::has_client(app_id) {
        client::drop_all_clients();
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

    let items_result = tokio::task::spawn_blocking(move || {
        let ugc = steam_client.ugc();
        let subscribed_items = ugc.subscribed_items();
        let item_ids: Vec<u64> = subscribed_items.iter().map(|id| id.0).collect();
        if item_ids.is_empty() {
            return Ok(WorkshopItemsResult {
                items: Vec::new(),
                was_cached: false,
            });
        }

        let (tx, rx) = std::sync::mpsc::channel();
        let query_handle = match steam_client
            .ugc()
            .query_items(item_ids.iter().map(|id| PublishedFileId(*id)).collect())
        {
            Ok(handle) => handle,
            Err(e) => return Err(format!("Failed to create query handle: {}", e)),
        };

        query_handle.fetch(move |fetch_result| {
            let _ = tx.send(
                fetch_result
                    .map(|query_results| WorkshopItemsResult::from_query_results(query_results)),
            );
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
    .await
    .unwrap_or_else(|e| Err(format!("Task join error: {}", e)))?;

    let workshop_base_path = find_workshop_path_for_app(app_id);
    let enhanced_items: Vec<ModItem> = items_result
        .items
        .into_iter()
        .filter_map(|item_opt| {
            item_opt
                .map(|item| {
                    let published_file_id = item.published_file_id.to_string();
                    let (pack_file, pack_file_path, preview_local) =
                        if let Some(ref base_path) = workshop_base_path {
                            let item_path = PathBuf::from(base_path).join(&published_file_id);
                            find_pack_and_image(&item_path)
                        } else {
                            (String::new(), String::new(), String::new())
                        };

                    if !pack_file.is_empty() {
                        Some(ModItem {
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
                        })
                    } else {
                        None
                    }
                })
                .flatten()
        })
        .collect();

    Ok(enhanced_items)
}
