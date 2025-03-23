use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, read_dir, remove_dir_all, rename, File};
use std::io::Write;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::sevenz::find_7zip_path::find_7zip_path;
use crate::utils::create_app_default_paths::create_app_default_paths;

use super::base_mods::ModVersion;
use super::validate_mod_path::validate_mod_path;

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallModDetails {
    identifier: String,
    title: String,
    zip_file_path: String,
    mod_file_path: String,
    downloaded_url: Option<String>,
    description: Option<String>,
    categories: Option<String>,
    url: Option<String>,
    image_file_path: Option<String>,
    preview_url: Option<String>,
    version: Option<ModVersion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallModMeta {
    pub identifier: String,
    pub title: String,
    pub mod_file: String,
    pub downloaded_url: Option<String>,
    pub description: Option<String>,
    pub categories: Option<String>,
    pub url: Option<String>,
    pub preview_url: Option<String>,
    pub version: Option<ModVersion>,
    pub created_at: u64,
    pub r#type: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn install_mod(
    handle: AppHandle,
    app_id: u32,
    mod_details: InstallModDetails,
    mod_installation_path: String,
) -> Result<(), String> {
    let _ = create_app_default_paths(handle.clone());
    if mod_details.zip_file_path.trim().is_empty() {
        return Err("Archive path cannot be empty".to_string());
    }

    let zip_path = Path::new(&mod_details.zip_file_path);
    if !zip_path.exists() {
        return Err(format!(
            "Archive file not found: {}",
            mod_details.zip_file_path
        ));
    }

    let seven_zip_path = find_7zip_path()
        .ok_or_else(|| "7-Zip is required but was not found. Please install 7-Zip.".to_string())?;

    let base_path = PathBuf::from(&mod_installation_path);
    if !base_path.exists() || !base_path.is_dir() {
        return Err("Invalid mod installation path".into());
    }

    let app_mods_path = base_path.join(app_id.to_string());
    let mod_folder = app_mods_path.join(&mod_details.identifier);
    let mod_id = mod_details.identifier.clone();
    validate_mod_path(&mod_folder, app_id, mod_id, false)?;

    create_dir_all(&mod_folder).map_err(|e| format!("Failed to create mod directory: {}", e))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Time error: {}", e))?
        .as_secs();

    let mod_file_resolved = Path::new(&mod_details.mod_file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Invalid mod file path");

    let mut preview_url = Some(String::new());
    if let Some(url) = &mod_details.preview_url {
        if !url.trim().is_empty() {
            preview_url = Some(url.clone());
        }
    }

    if preview_url.as_ref().map_or(true, |s| s.is_empty()) {
        if let Some(image_file_path) = &mod_details.image_file_path {
            if !image_file_path.trim().is_empty() {
                let output_path = format!("-o{}", mod_folder.to_str().unwrap());
                let extract_result = Command::new(&seven_zip_path)
                    .creation_flags(0x08000000)
                    .args([
                        "e",
                        &mod_details.zip_file_path,
                        image_file_path,
                        &output_path,
                        "-y",
                    ])
                    .output();

                if let Ok(output) = extract_result {
                    if output.status.success() {
                        if let Some(image_filename) = Path::new(image_file_path).file_name() {
                            if let Some(filename_str) = image_filename.to_str() {
                                preview_url = Some(filename_str.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    let is_nexus = mod_details
        .url
        .clone()
        .unwrap_or("".to_string())
        .contains("www.nexusmods.com");
    let mod_type = if is_nexus { "nexus" } else { "local" };
    let meta = InstallModMeta {
        identifier: mod_details.identifier.clone(),
        title: mod_details.title.clone(),
        description: mod_details.description.clone(),
        categories: mod_details.categories.clone(),
        version: mod_details.version,
        preview_url,
        url: mod_details.url.clone(),
        mod_file: mod_file_resolved.to_owned(),
        downloaded_url: mod_details.downloaded_url.clone(),
        created_at: now,
        r#type: mod_type.to_string(),
    };

    let meta_path = mod_folder.join("meta.json");
    let meta_json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    let mut meta_file =
        File::create(&meta_path).map_err(|e| format!("Failed to create metadata file: {}", e))?;
    meta_file
        .write_all(meta_json.as_bytes())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    let temp_extract_folder = mod_folder.join("_temp_extract");
    create_dir_all(&temp_extract_folder)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let output = Command::new(&seven_zip_path)
        .creation_flags(0x08000000)
        .args([
            "x",
            &mod_details.zip_file_path,
            &format!("-o{}", temp_extract_folder.to_str().unwrap()),
            "-y",
        ])
        .output()
        .map_err(|e| format!("Failed to execute 7z: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        let _ = remove_dir_all(&temp_extract_folder);
        return Err(format!("7z extraction failed: {}", error));
    }

    let source_path = temp_extract_folder.join(&mod_details.mod_file_path);

    if source_path.exists() {
        if source_path.is_dir() {
            let entries = read_dir(&source_path)
                .map_err(|e| format!("Failed to read directory contents: {}", e))?;

            for entry in entries {
                let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
                let target_path = mod_folder.join(entry.file_name());
                rename(entry.path(), target_path)
                    .map_err(|e| format!("Failed to move file: {}", e))?;
            }
        } else {
            let file_name = source_path
                .file_name()
                .ok_or_else(|| "Invalid file path".to_string())?;
            let target_path = mod_folder.join(file_name);
            rename(&source_path, target_path).map_err(|e| format!("Failed to move file: {}", e))?;
        }
    } else {
        let _ = remove_dir_all(&temp_extract_folder);
        return Err(format!(
            "Path not found in archive: {}",
            mod_details.mod_file_path
        ));
    }

    remove_dir_all(&temp_extract_folder)
        .map_err(|e| format!("Failed to clean up temp directory: {}", e))?;

    Ok(())
}
