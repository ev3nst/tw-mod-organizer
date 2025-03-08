use std::{
    fs::read_dir,
    path::{Path, PathBuf},
};
use trash::delete;

use crate::protected_paths::PROTECTED_PATHS;

fn has_pack_file(path: &Path) -> bool {
    if let Ok(entries) = read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("pack") {
                    return true;
                }
            }
        }
    }
    false
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

    let mod_info_exists = path.join("meta.json").exists();
    let pack_file_exists = has_pack_file(path);

    if !mod_info_exists || !pack_file_exists {
        return Err("Directory does not appear to be a valid mod folder".into());
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_mod(
    app_id: u32,
    item_id: serde_json::Value,
    mod_installation_path: String,
) -> Result<bool, String> {
    let item_id = match item_id {
        serde_json::Value::String(s) => s,
        serde_json::Value::Number(n) if n.is_u64() => n.as_u64().unwrap().to_string(),
        _ => return Err("Invalid item_id format".into()),
    };

    let base_path = PathBuf::from(&mod_installation_path);
    if !base_path.exists() || !base_path.is_dir() {
        return Err("Invalid mod installation path".into());
    }

    let app_mods_path = base_path.join(app_id.to_string());
    let mod_folder = app_mods_path.join(&item_id);

    if !mod_folder.exists() || !mod_folder.is_dir() {
        return Err("Mod directory does not exist".into());
    }

    validate_mod_path(&mod_folder, app_id, item_id)?;
    delete(&mod_folder).map_err(|e| format!("Failed to delete mod: {}", e))?;
    Ok(true)
}
