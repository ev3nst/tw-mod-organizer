use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs::metadata, sync::Arc};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use trash::delete;

use crate::utils::create_app_default_paths::create_app_default_paths;
use crate::AppState;

use super::migrate_legacy_meta_files::migrate_legacy_meta_files;
use super::supported_games::SUPPORTED_GAMES;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileData {
    filename: String,
    filesize: u64,
    path: String,
    date: u128,
    event_type: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_folder_watch(
    state: tauri::State<'_, AppState>,
    handle: AppHandle,
    app_id: u32,
) -> Result<(), String> {
    let _ = create_app_default_paths(handle.clone());
    let _ = migrate_legacy_meta_files(&handle, app_id);

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let save_watcher_running = Arc::clone(&state.save_watcher_running);
    if save_watcher_running.load(Ordering::SeqCst) {
        save_watcher_running.store(false, Ordering::SeqCst);
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    let folder_clone = state.save_folder_path.lock().await.clone();
    if !folder_clone.exists() || folder_clone.to_string_lossy().is_empty() {
        return Err("Save Folder path is not set or does not exist.".to_string());
    }

    let save_file_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?
        .join(app_id.to_string());

    let save_file_names: Vec<String> = fs::read_dir(&folder_clone)
        .map_err(|e| format!("Failed to read save folder: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            entry.path().file_name()?.to_str().map(|s| {
                s.trim_end_matches(&format!(".{}", game.save_file_extension))
                    .to_string()
            })
        })
        .collect();

    if save_file_meta_folder.exists() {
        for entry in fs::read_dir(&save_file_meta_folder)
            .map_err(|e| format!("Failed to read meta folder: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read meta entry: {}", e))?;
            let meta_path = entry.path();

            if let Some(meta_file_name) = meta_path.file_name().and_then(|s| s.to_str()) {
                if meta_file_name.ends_with(".meta") {
                    let save_file_name = meta_file_name.trim_end_matches(".meta");
                    if !save_file_names.contains(&save_file_name.to_string()) {
                        delete(&meta_path)
                            .map_err(|e| format!("Failed to delete meta file: {}", e))?;
                    }
                }
            }
        }
    }

    save_watcher_running.store(true, Ordering::SeqCst);

    let (tx, mut rx) = mpsc::channel(100);
    let folder_to_watch = folder_clone.clone();

    let _watcher = tokio::task::spawn_blocking({
        let tx = tx.clone();
        let folder_clone = folder_to_watch;
        let save_watcher_running = Arc::clone(&save_watcher_running);

        move || {
            let mut watcher: RecommendedWatcher =
                notify::recommended_watcher(move |res: Result<Event, _>| {
                    if let Ok(event) = res {
                        if let Some(path) = event.paths.first() {
                            if path.extension().and_then(|s| s.to_str())
                                == Some(game.save_file_extension)
                            {
                                let event_type = match event.kind {
                                    EventKind::Create(_) => "created",
                                    EventKind::Modify(_) => "modified",
                                    EventKind::Remove(_) => "removed",
                                    _ => "other",
                                };

                                let _ = tx.blocking_send((path.clone(), event_type.to_string()));
                            }
                        }
                    }
                })
                .expect("Failed to create watcher");

            if let Err(e) = watcher.watch(&folder_clone, RecursiveMode::NonRecursive) {
                eprintln!("Failed to watch folder: {:?}", e);
                save_watcher_running.store(false, Ordering::SeqCst);
                return None;
            }

            while save_watcher_running.load(Ordering::SeqCst) {
                std::thread::sleep(std::time::Duration::from_millis(100));
            }

            Some(watcher)
        }
    });

    tokio::spawn({
        let save_watcher_running = Arc::clone(&save_watcher_running);
        let handle = handle.clone();

        async move {
            while let Some((path, event_type)) = rx.recv().await {
                if !save_watcher_running.load(Ordering::SeqCst) {
                    break;
                }

                if let Some(extension) = path.extension() {
                    if extension == game.save_file_extension {
                        if path.to_string_lossy().ends_with(&format!(
                            ".{}.{}",
                            game.save_file_extension, game.save_file_extension
                        )) {
                            continue;
                        }

                        if event_type != "removed" {
                            if let Ok(meta) = metadata(&path) {
                                let timestamp = meta
                                    .modified()
                                    .unwrap_or_else(|_| meta.created().unwrap_or(SystemTime::now()))
                                    .duration_since(UNIX_EPOCH)
                                    .expect("Time went backwards")
                                    .as_millis();

                                let file_data = FileData {
                                    filename: path
                                        .file_name()
                                        .map(|f| f.to_string_lossy().to_string())
                                        .unwrap_or_else(|| "unknown".to_string()),
                                    filesize: meta.len(),
                                    path: path.to_string_lossy().to_string(),
                                    date: timestamp,
                                    event_type,
                                };

                                if let Err(e) = handle.emit("save-file", file_data) {
                                    eprintln!("Failed to emit event: {:?}", e);
                                }
                            } else {
                                eprintln!("Failed to read metadata for file: {:?}", path);
                                continue;
                            }
                        }
                    }
                }
            }

            save_watcher_running.store(false, Ordering::SeqCst);
        }
    });

    Ok(())
}
