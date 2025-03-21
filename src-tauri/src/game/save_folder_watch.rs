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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileData {
    filename: String,
    filesize: u64,
    path: String,
    date: u64,
    event_type: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_folder_watch(
    state: tauri::State<'_, AppState>,
    handle: AppHandle,
) -> Result<(), String> {
    let _ = create_app_default_paths(handle.clone());

    let save_watcher_running = Arc::clone(&state.save_watcher_running);
    if save_watcher_running.load(Ordering::SeqCst) {
        return Ok(());
    }

    let folder_clone = state.save_folder_path.lock().await.clone();
    if !folder_clone.exists() || folder_clone.to_string_lossy().is_empty() {
        return Err("Save Folder path is not set or does not exist.".to_string());
    }

    let save_file_meta_folder = handle
        .path()
        .resolve("save_file_meta".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    let save_file_names: Vec<String> = fs::read_dir(&folder_clone)
        .map_err(|e| format!("Failed to read save folder: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            entry
                .path()
                .file_name()?
                .to_str()
                .map(|s| s.trim_end_matches(".save").to_string())
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
    let _watcher = tokio::task::spawn_blocking({
        let tx = tx.clone();
        let folder_clone = folder_clone.clone();
        move || {
            let mut watcher: RecommendedWatcher =
                notify::recommended_watcher(move |res: Result<Event, _>| {
                    if let Ok(event) = res {
                        if let Some(path) = event.paths.first() {
                            if path.extension().and_then(|s| s.to_str()) == Some("save") {
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
                return None;
            }

            let forever = std::sync::mpsc::channel::<()>();
            forever.1.recv().ok();
            Some(watcher)
        }
    });

    tokio::spawn({
        let save_watcher_running = Arc::clone(&save_watcher_running);
        async move {
            while let Some((path, event_type)) = rx.recv().await {
                if let Some(extension) = path.extension() {
                    if extension == "save" {
                        if path.to_string_lossy().ends_with(".save.save") {
                            continue;
                        }

                        if event_type != "removed" {
                            if let Ok(meta) = metadata(&path) {
                                let timestamp = meta
                                    .modified()
                                    .unwrap_or_else(|_| meta.created().unwrap_or(SystemTime::now()))
                                    .duration_since(UNIX_EPOCH)
                                    .expect("Time went backwards")
                                    .as_secs();

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
