use reqwest::{
    header::{HeaderValue, RANGE},
    Client,
};
use std::io::{self, Seek, SeekFrom, Write};
use std::path::Path;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::Emitter;
use trash::delete;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DownloadTask {
    pub id: i64,
    pub url: String,
    pub filename: String,
    pub total_size: u64,
    pub bytes_downloaded: u64,
    pub status: String,
    pub download_path: String,
}

#[derive(Debug, Clone)]
pub struct DownloadManager {
    pub client: Client,
    pub current_download: Arc<Mutex<Option<DownloadTask>>>,
    pub is_paused: Arc<AtomicBool>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DownloadSyncRequest {
    pub filename: String,
    pub download_path: String,
    pub expected_bytes_downloaded: u64,
    pub total_size: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DownloadSyncResult {
    pub filename: String,
    pub actual_bytes_downloaded: u64,
    pub status: String,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            current_download: Arc::new(Mutex::new(None)),
            is_paused: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn download_single_file(
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
            if is_paused.load(Ordering::Relaxed) {
                break;
            }

            let bytes_read = response.chunk().await?;
            let Some(chunk) = bytes_read else {
                break;
            };

            file.write_all(&chunk)?;
            task.bytes_downloaded += chunk.len() as u64;

            if !is_paused.load(Ordering::Relaxed) {
                handle.emit(
                    "download-progress",
                    serde_json::json!({
                        "download_id": task.id,
                        "bytes_downloaded": task.bytes_downloaded,
                        "total_size": task.total_size
                    }),
                )?;
            }
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
