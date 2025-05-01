use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::totalwar;
use crate::game::supported_games::SUPPORTED_GAMES;

#[derive(Serialize, Deserialize)]
pub struct CacheEntry {
    pub file_paths: Vec<String>,
    pub file_metadata: FxHashMap<String, FileMetadata>,
    pub conflicts: BTreeMap<String, BTreeMap<String, Vec<String>>>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct FileMetadata {
    pub size: u64,
    pub modified: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn conflicts(
    handle: tauri::AppHandle,
    app_id: u32,
    folder_paths: Vec<String>,
) -> Result<BTreeMap<String, BTreeMap<String, Vec<String>>>, String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    match game.r#type.as_ref() {
        "totalwar" => {
            let conflicts_result =
                totalwar::conflicts::conflicts(handle, app_id, folder_paths).await?;
            Ok(conflicts_result)
        }
        "bannerlord" => Ok(BTreeMap::new()),
        _ => Err(format!("Game type '{}' is not supported", game.r#type)),
    }
}
