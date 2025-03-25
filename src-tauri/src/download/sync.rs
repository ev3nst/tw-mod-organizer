use std::{fs::metadata, path::Path};

use super::manager::{DownloadSyncRequest, DownloadSyncResult};

#[tauri::command(rename_all = "snake_case")]
pub async fn sync_downloads(
    downloads: Vec<DownloadSyncRequest>,
) -> Result<Vec<DownloadSyncResult>, String> {
    let mut sync_results = Vec::new();

    for download in downloads {
        let file_path = Path::new(&download.download_path).join(&download.filename);
        let actual_bytes_downloaded = match metadata(&file_path) {
            Ok(metadata) => metadata.len(),
            Err(_) => 0,
        };

        let status = if actual_bytes_downloaded == download.total_size {
            "completed".to_string()
        } else if actual_bytes_downloaded > 0 && actual_bytes_downloaded < download.total_size {
            "in_progress".to_string()
        } else {
            "queued".to_string()
        };

        sync_results.push(DownloadSyncResult {
            filename: download.filename,
            actual_bytes_downloaded,
            status,
        });
    }

    Ok(sync_results)
}
