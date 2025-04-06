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

        let mut file = match std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .read(true)
            .open(&file_path)
        {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to open file: {}", e);
                return Err(Box::new(e));
            }
        };

        if let Err(e) = file.seek(SeekFrom::Start(start_byte)) {
            eprintln!("Failed to seek file: {}", e);
            return Err(Box::new(e));
        }

        let request = client.get(&task.url).header(
            RANGE,
            HeaderValue::from_str(&format!("bytes={}-", start_byte))?,
        );

        let mut response = match request.send().await {
            Ok(resp) => resp,
            Err(e) => {
                eprintln!("Failed to send request: {}", e);
                return Err(Box::new(e));
            }
        };

        if task.total_size == 0 {
            task.total_size = response.content_length().unwrap_or(0);
        }

        let mut download_completed = false;

        {
            loop {
                if is_paused.load(Ordering::Relaxed) {
                    if let Err(e) = file.flush() {
                        eprintln!("Failed to flush file on pause: {}", e);
                    }
                    break;
                }

                let bytes_read = match response.chunk().await {
                    Ok(chunk) => chunk,
                    Err(e) => {
                        eprintln!("Failed to read chunk: {}", e);
                        break;
                    }
                };

                let Some(chunk) = bytes_read else {
                    download_completed = true;
                    break;
                };

                if let Err(e) = file.write_all(&chunk) {
                    eprintln!("Failed to write chunk: {}", e);
                    break;
                }

                task.bytes_downloaded += chunk.len() as u64;

                if !is_paused.load(Ordering::Relaxed) {
                    if let Err(e) = handle.emit(
                        "download-progress",
                        serde_json::json!({
                            "download_id": task.id,
                            "bytes_downloaded": task.bytes_downloaded,
                            "total_size": task.total_size
                        }),
                    ) {
                        eprintln!("Failed to emit progress event: {}", e);
                    }
                }

                if task.bytes_downloaded >= task.total_size {
                    download_completed = true;
                    break;
                }
            }

            if let Err(e) = file.flush() {
                eprintln!("Failed to flush file at completion: {}", e);
            }
        }

        let final_status = if download_completed || task.bytes_downloaded >= task.total_size {
            if let Err(e) = handle.emit(
                "download-complete",
                serde_json::json!({
                    "download_id": task.id,
                    "bytes_downloaded": task.bytes_downloaded,
                    "total_size": task.total_size
                }),
            ) {
                eprintln!("Failed to emit complete event: {}", e);
            }
            "completed".to_string()
        } else {
            "paused".to_string()
        };

        Ok(final_status)
    }

    pub fn delete_file(&self, download_path: &str, filename: &str) -> io::Result<()> {
        let file_path = Path::new(download_path).join(filename);

        for _ in 0..3 {
            if file_path.exists() {
                match trash::delete(&file_path) {
                    Ok(_) => return Ok(()),
                    Err(e) => {
                        eprintln!("Failed to delete file: {}, retrying...", e);
                        // Wait a moment before retrying
                        std::thread::sleep(std::time::Duration::from_millis(500));
                    }
                }
            } else {
                return Ok(());
            }
        }

        if file_path.exists() {
            match std::fs::remove_file(&file_path) {
                Ok(_) => Ok(()),
                Err(e) => {
                    eprintln!("Force delete failed: {}", e);
                    Err(e)
                }
            }
        } else {
            Ok(())
        }
    }
}
