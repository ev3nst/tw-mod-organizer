use std::path::PathBuf;
use trash::delete;

use super::validate_mod_path::validate_mod_path;

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

    validate_mod_path(&mod_folder, app_id, item_id, true)?;
    delete(&mod_folder).map_err(|e| format!("Failed to delete mod: {}", e))?;
    Ok(true)
}
