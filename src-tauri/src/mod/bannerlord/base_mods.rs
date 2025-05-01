use std::{fs, path::PathBuf, time::UNIX_EPOCH};
use tauri::Manager;
use tauri::path::BaseDirectory;

use crate::{
    game::{find_installation_path::find_installation_path, supported_games::SUPPORTED_GAMES},
    r#mod::base_mods::{ModItem, ModVersion},
};

use crate::xml::submodule_contents::submodule_contents;

pub async fn base_mods(handle: tauri::AppHandle, app_id: u32) -> Result<Vec<ModItem>, String> {
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;
    let game_installation_path = match find_installation_path(game.clone()) {
        Some(path) => path,
        None => {
            return Err(format!(
                "Could not find installation path for game with app_id {}",
                app_id
            ));
        }
    };

    let mut mods: Vec<ModItem> = vec![];
    let created_at = UNIX_EPOCH
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let mods_path = PathBuf::from(game_installation_path).join("Modules");
    for entry in fs::read_dir(&mods_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let mod_path = entry.path();

        if !mod_path.is_dir() {
            continue;
        }

        let submodule_xml_path = mod_path.join("SubModule.xml");
        if !submodule_xml_path.exists() {
            continue;
        }

        let submodule_info = match submodule_contents(
            &mod_path,
            &app_cache_dir,
            app_id,
            entry.file_name().to_string_lossy().to_string(),
        ) {
            Some(info) => info,
            None => {
                return Err(format!(
                    "Failed to parse SubModule.xml in directory: {}",
                    mod_path.display()
                ));
            }
        };

        if submodule_info.id == "Multiplayer" {
            continue;
        }

        let module_type = submodule_info.module_type.unwrap_or("".to_owned());
        if module_type != "Official" && module_type != "OfficialOptional" {
            continue;
        }

        let required_items: Vec<String> = submodule_info
            .depended_modules
            .unwrap_or_default()
            .iter()
            .map(|module| module.id.clone())
            .collect();

        let child_mods: Vec<String> = submodule_info
            .modules_to_load_after_this
            .unwrap_or_default()
            .iter()
            .map(|module| module.id.clone())
            .collect();

        mods.push(ModItem {
            game_specific_id: submodule_info.id.clone(),
            identifier: submodule_info.id,
            title: submodule_info.name.clone(),
            description: Some(String::from("")),
            created_at,
            updated_at: Some(created_at),
            categories: Some(String::from("Official")),
            url: None,
            download_url: None,
            preview_url: None,
            version: Some(ModVersion::Text(
                submodule_info.version.unwrap_or_else(|| "".to_string()),
            )),
            item_type: String::from("base_mod"),
            mod_file: submodule_info.name,
            mod_file_path: mod_path.to_string_lossy().to_string(),
            preview_local: String::from(""),
            creator_id: None,
            creator_name: Some(String::from("")),
            required_items: required_items,
            child_mods: child_mods,
        });
    }

    Ok(mods)
}
