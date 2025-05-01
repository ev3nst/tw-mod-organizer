use std::path::PathBuf;

use crate::game::supported_games::SUPPORTED_GAMES;

use super::bannerlord;
use super::base_mods::ModItem;
use super::totalwar;

#[tauri::command(rename_all = "snake_case")]
pub async fn local_mods(
    handle: tauri::AppHandle,
    app_id: u32,
    mod_installation_path: String,
) -> Result<Vec<ModItem>, String> {
    let app_mods_path = PathBuf::from(&mod_installation_path).join(app_id.to_string());
    if !app_mods_path.exists() {
        return Ok(vec![]);
    }

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    match game.r#type.as_ref() {
        "totalwar" => {
            let mods = totalwar::local_mods::local_mods(app_mods_path).await?;
            Ok(mods)
        }
        "bannerlord" => {
            let mods = bannerlord::local_mods::local_mods(handle, app_id, app_mods_path).await?;
            Ok(mods)
        }
        _ => Err(format!("Game type '{}' is not supported", game.r#type)),
    }
}
