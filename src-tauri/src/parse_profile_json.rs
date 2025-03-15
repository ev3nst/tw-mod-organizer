use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModActivation {
    is_active: bool,
    mod_id: String,
    title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModMeta {
    categories: Option<String>,
    mod_id: String,
    title: Option<String>,
    version: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModOrder {
    mod_id: String,
    order: u32,
    pack_file_path: Option<String>,
    title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModSeparator {
    background_color: Option<String>,
    collapsed: bool,
    identifier: String,
    order: u32,
    text_color: Option<String>,
    title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModEntry {
    categories: Option<String>,
    created_at: i64,
    description: Option<String>,
    identifier: String,
    item_type: Option<String>,
    pack_file: Option<String>,
    pack_file_path: Option<String>,
    preview_local: Option<String>,
    preview_url: Option<String>,
    title: String,
    url: Option<String>,
    version: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileData {
    app_id: u32,
    mod_activation: Vec<ModActivation>,
    mod_meta: Vec<ModMeta>,
    mod_order: Vec<ModOrder>,
    mod_separators: Vec<ModSeparator>,
    mods: Vec<ModEntry>,
    name: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn parse_profile_json(json_path: String) -> Result<ProfileData, String> {
    let path = Path::new(&json_path);
    if !path.exists() || !path.is_file() {
        return Err("Invalid file path".to_string());
    }

    if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
        return Err("File is not a JSON file".to_string());
    }

    let file_content = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let parsed_data: ProfileData =
        serde_json::from_str(&file_content).map_err(|err| err.to_string())?;

    Ok(parsed_data)
}
