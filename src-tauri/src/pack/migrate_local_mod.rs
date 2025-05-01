use std::fs::{self, File, create_dir_all};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

use crate::r#mod::base_mods::ModVersion;
use crate::r#mod::install::InstallModMeta;
use crate::utils::protected_paths::PROTECTED_PATHS;

pub fn migrate_local_mod(
    app_id: u32,
    source_path: &str,
    mod_title: &str,
    categories: Option<Vec<String>>,
    mod_installation_path: &str,
) -> Result<String, String> {
    let source_path = Path::new(source_path);
    if !source_path.exists() || !source_path.is_file() {
        return Err(format!(
            "Source pack file does not exist: {}",
            source_path.display()
        ));
    }

    let mod_file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Failed to get file name or convert to string".to_string())?;

    let uuid;

    let base_path = PathBuf::from(mod_installation_path);
    if !base_path.exists() || !base_path.is_dir() {
        return Err("Invalid mod installation path".into());
    }

    let app_mods_path = base_path.join(app_id.to_string());
    let existing_mod_folder = if app_mods_path.exists() {
        app_mods_path
            .read_dir()
            .map_err(|e| format!("Failed to read app mods directory: {}", e))?
            .filter_map(Result::ok)
            .find(|entry| entry.path().join(mod_file_name).exists())
    } else {
        create_dir_all(&app_mods_path)
            .map_err(|e| format!("Failed to create app mods directory: {}", e))?;
        None
    };

    if let Some(existing_entry) = existing_mod_folder {
        uuid = existing_entry
            .file_name()
            .to_str()
            .ok_or_else(|| "Failed to get folder name as string".to_string())?
            .to_string();
    } else {
        uuid = Uuid::new_v4().to_string();
        let mod_folder = app_mods_path.join(&uuid);

        validate_mod_path(&mod_folder, app_id, uuid.clone())?;
        create_dir_all(&mod_folder)
            .map_err(|e| format!("Failed to create mod directory: {}", e))?;
    }

    let mod_folder = app_mods_path.join(&uuid);

    let mut preview_url = None;
    let image_extensions = ["png", "jpg"];
    for ext in &image_extensions {
        let image_path = source_path.with_extension(ext);
        if image_path.exists() && image_path.is_file() {
            let dest_image_path = mod_folder.join(image_path.file_name().unwrap());
            fs::copy(&image_path, &dest_image_path)
                .map_err(|e| format!("Failed to copy image file: {}", e))?;

            preview_url = Some(dest_image_path.to_str().unwrap_or_default().to_string());
            break;
        }
    }

    let dest_path = mod_folder.join(mod_file_name);
    fs::copy(source_path, &dest_path).map_err(|e| format!("Failed to copy pack file: {}", e))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Time error: {}", e))?
        .as_millis();

    let meta = InstallModMeta {
        identifier: uuid.clone(),
        title: mod_title.to_string(),
        mod_file: mod_file_name.to_owned(),
        download_url: Some("".to_string()),
        description: Some("".to_string()),
        categories: categories.map(|cats| cats.join(", ")),
        url: Some("".to_string()),
        preview_url: preview_url,
        version: Some(ModVersion::Text("".to_string())),
        creator_id: Some("".to_string()),
        creator_name: Some("".to_string()),
        created_at: now,
        updated_at: Some(now),
        r#type: "local".to_owned(),
    };

    let meta_path = mod_folder.join("meta.json");
    let meta_json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    let mut meta_file =
        File::create(&meta_path).map_err(|e| format!("Failed to create metadata file: {}", e))?;
    meta_file
        .write_all(meta_json.as_bytes())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(uuid)
}

fn validate_mod_path(path: &Path, app_id: u32, item_id: String) -> Result<(), String> {
    let path_str = path.to_string_lossy();
    for protected in PROTECTED_PATHS {
        if path_str.starts_with(protected) {
            return Err(format!(
                "Access to protected path '{}' is forbidden",
                protected
            ));
        }
    }
    let expected_suffix = format!("{}\\{}", app_id, item_id);
    if !path_str.ends_with(&expected_suffix) {
        return Err(format!(
            "Path does not match expected folder structure: {}",
            path_str
        ));
    }
    Ok(())
}
