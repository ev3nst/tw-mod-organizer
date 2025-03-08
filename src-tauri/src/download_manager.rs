use reqwest::{
    header::{HeaderValue, RANGE},
    Client,
};
use std::path::Path;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::{
    fs,
    io::{self, Seek, SeekFrom, Write},
};
use tauri::Emitter;
use trash::delete;

use crate::create_app_default_paths::create_app_default_paths;
use crate::AppState;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DownloadTask {
    id: i64,
    url: String,
    filename: String,
    total_size: u64,
    bytes_downloaded: u64,
    status: String,
    download_path: String,
}

#[derive(Debug, Clone)]
pub struct DownloadManager {
    pub client: Client,
    pub current_download: Arc<Mutex<Option<DownloadTask>>>,
    pub is_paused: Arc<AtomicBool>,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            current_download: Arc::new(Mutex::new(None)),
            is_paused: Arc::new(AtomicBool::new(false)),
        }
    }

    async fn download_single_file(
        client: &Client,
        handle: tauri::AppHandle,
        task: &mut DownloadTask,
        is_paused: Arc<AtomicBool>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let download_dir = Path::new(&task.download_path);
        std::fs::create_dir_all(download_dir)?;

        let file_path = download_dir.join(&task.filename);
        let start_byte = task.bytes_downloaded;

        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .read(true)
            .open(&file_path)?;
        file.seek(SeekFrom::Start(start_byte))?;
        let request = client.get(&task.url).header(
            RANGE,
            HeaderValue::from_str(&format!("bytes={}-", start_byte))?,
        );

        let mut response = request.send().await?;
        if task.total_size == 0 {
            task.total_size = response.content_length().unwrap_or(0);
        }

        loop {
            if is_paused.load(Ordering::SeqCst) {
                break;
            }

            let bytes_read = response.chunk().await?;
            let Some(chunk) = bytes_read else {
                break;
            };

            file.write_all(&chunk)?;
            task.bytes_downloaded += chunk.len() as u64;

            handle.emit(
                "download-progress",
                serde_json::json!({
                    "download_id": task.id,
                    "bytes_downloaded": task.bytes_downloaded,
                    "total_size": task.total_size
                }),
            )?;
        }

        let final_status = if task.bytes_downloaded >= task.total_size {
            handle.emit(
                "download-complete",
                serde_json::json!({
                    "download_id": task.id
                }),
            )?;
            "completed".to_string()
        } else {
            "paused".to_string()
        };

        Ok(final_status)
    }

    pub fn delete_file(&self, download_path: &str, filename: &str) -> io::Result<()> {
        let file_path = Path::new(download_path).join(filename);
        if file_path.exists() {
            let _ = delete(&file_path).map_err(|e| format!("Failed to delete. {}", e));
        }
        Ok(())
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn start_download(
    handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    task: DownloadTask,
) -> Result<(), String> {
    let _ = create_app_default_paths(handle.clone());

    let download_manager = state.download_manager.lock().await;
    download_manager.is_paused.store(false, Ordering::SeqCst);

    {
        let mut current_download = download_manager
            .current_download
            .lock()
            .map_err(|_| "Failed to lock current download".to_string())?;
        *current_download = Some(task.clone());
    }

    let client = download_manager.client.clone();
    let handle_clone = handle.clone();
    let mut task_clone = task.clone();
    let current_download = download_manager.current_download.clone();
    let is_paused = download_manager.is_paused.clone();

    tokio::spawn(async move {
        match DownloadManager::download_single_file(
            &client,
            handle_clone,
            &mut task_clone,
            is_paused,
        )
        .await
        {
            Ok(final_status) => {
                if let Ok(mut current_download) = current_download.lock() {
                    if let Some(current_task) = current_download.as_mut() {
                        current_task.status = final_status;
                    }
                }
            }
            Err(e) => {
                eprintln!("Download error: {:?}", e);
            }
        }
    });

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pause_download(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let download_manager = state.download_manager.lock().await;
    download_manager.is_paused.store(true, Ordering::SeqCst);

    let mut current_download = download_manager.current_download.lock().unwrap();
    if let Some(task) = current_download.as_mut() {
        task.status = "paused".to_string();
        Ok(())
    } else {
        Err("No active download to pause".to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_download(
    state: tauri::State<'_, AppState>,
    download_path: String,
    filename: String,
) -> Result<(), String> {
    let download_manager = state.download_manager.lock().await;

    {
        let mut current_download = download_manager.current_download.lock().unwrap();
        *current_download = None;
    }

    download_manager
        .delete_file(&download_path, &filename)
        .map_err(|e| format!("Failed to delete file: {}", e))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DownloadSyncRequest {
    filename: String,
    download_path: String,
    expected_bytes_downloaded: u64,
    total_size: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DownloadSyncResult {
    filename: String,
    actual_bytes_downloaded: u64,
    status: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn sync_downloads(
    downloads: Vec<DownloadSyncRequest>,
) -> Result<Vec<DownloadSyncResult>, String> {
    let mut sync_results = Vec::new();

    for download in downloads {
        let file_path = Path::new(&download.download_path).join(&download.filename);
        let actual_bytes_downloaded = match fs::metadata(&file_path) {
            Ok(metadata) => metadata.len(),
            Err(_) => 0,
        };

        let status = if actual_bytes_downloaded == download.total_size {
            "completed".to_string()
        } else if actual_bytes_downloaded > 0 && actual_bytes_downloaded < download.total_size {
            "in_progress".to_string()
        } else {
            "not_started".to_string()
        };

        sync_results.push(DownloadSyncResult {
            filename: download.filename,
            actual_bytes_downloaded,
            status,
        });
    }

    Ok(sync_results)
}
