use serde::Deserialize;

use crate::game::supported_games::SUPPORTED_GAMES;

use super::bannerlord;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum ModVersion {
    Number(u128),
    Text(String),
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ModItem {
    pub game_specific_id: String,
    pub identifier: String,
    pub title: String,
    pub description: Option<String>,
    pub created_at: u128,
    pub categories: Option<String>,
    pub url: Option<String>,
    pub download_url: Option<String>,
    pub preview_url: Option<String>,
    pub version: Option<ModVersion>,
    pub updated_at: Option<u128>,
    pub item_type: String,
    pub mod_file: String,
    pub mod_file_path: String,
    pub preview_local: String,
    pub creator_id: Option<String>,
    pub creator_name: Option<String>,
    pub required_items: Vec<String>,
    pub child_mods: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct LocalModMeta {
    pub identifier: String,
    pub title: String,
    pub description: Option<String>,
    pub created_at: u128,
    pub updated_at: Option<u128>,
    pub categories: Option<String>,
    pub url: Option<String>,
    pub download_url: Option<String>,
    pub preview_url: Option<String>,
    pub creator_id: Option<String>,
    pub creator_name: Option<String>,
    pub version: Option<ModVersion>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn base_mods(handle: tauri::AppHandle, app_id: u32) -> Result<Vec<ModItem>, String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    match game.r#type.as_ref() {
        "totalwar" => Ok(vec![]),
        "bannerlord" => {
            let mods = bannerlord::base_mods::base_mods(handle, app_id).await?;
            Ok(mods)
        }
        _ => Err(format!("Game type '{}' is not supported", game.r#type)),
    }
}
