use rpfm_lib::files::pack::Pack;
use std::path::PathBuf;
use tokio::task;

#[tauri::command(rename_all = "snake_case")]
pub async fn get_pack_files(pack_file_path: String) -> Result<Vec<String>, String> {
    let files_vec: Vec<PathBuf> = vec![PathBuf::from(pack_file_path)];
    let result = task::spawn_blocking(move || {
        let packfile = Pack::read_and_merge(&files_vec, true, false, false)
            .map_err(|e| format!("Failed to read pack file: {}", e))?;
        let paths: Vec<String> = packfile.paths().keys().cloned().collect();
        Ok(paths)
    })
    .await
    .map_err(|e| format!("Task failed: {:?}", e))?;

    result
}
