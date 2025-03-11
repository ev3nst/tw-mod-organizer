use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::create_app_default_paths::create_app_default_paths;
use crate::migrate_local_mod::migrate_local_mod;
use crate::protected_paths::PROTECTED_PATHS;
use crate::supported_games::SUPPORTED_GAMES;

#[derive(Deserialize)]
struct InputMod {
    #[serde(rename = "workshopId")]
    workshop_id: String,

    #[serde(rename = "isEnabled")]
    is_enabled: bool,

    path: String,
    name: String,

    #[serde(default)]
    categories: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct InputGameMods {
    mods: Vec<InputMod>,
}

#[derive(Deserialize)]
struct InputModPreset {
    name: String,
    mods: Vec<InputMod>,
}

#[derive(Deserialize)]
struct InputData {
    #[serde(rename = "gameToCurrentPreset")]
    game_to_current_preset: HashMap<String, InputGameMods>,
    #[serde(rename = "gameToPresets")]
    game_to_presets: HashMap<String, Vec<InputModPreset>>,
}

#[derive(Serialize)]
struct OutputModInfo {
    identifier: String,
    categories: String,
}

#[derive(Serialize)]
struct OutputModActive {
    identifier: String,
    title: String,
    pack_file_path: String,
    is_active: bool,
}

#[derive(Serialize)]
struct OutputProfile {
    profile_name: String,
    mods: Vec<OutputModActive>,
}

#[derive(Serialize)]
pub struct OutputData {
    mod_meta_information: HashMap<String, Vec<OutputModInfo>>,
    mod_profiles: HashMap<String, Vec<OutputProfile>>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn import_data(
    handle: tauri::AppHandle,
    json_file_path: String,
    mod_installation_path: String,
) -> Result<OutputData, String> {
    let _ = create_app_default_paths(handle.clone());

    // json validation
    let path = Path::new(&json_file_path);
    if is_path_protected(path) {
        return Err("Access to the specified path is not allowed.".to_string());
    }
    if !path.exists() || !path.is_file() {
        return Err("The specified path is not a valid file.".to_string());
    }
    if path.file_name() != Some(std::ffi::OsStr::new("config.json")) {
        return Err("Only files named 'config.json' are accepted.".to_string());
    }

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read file metadata ({}): {}", path.display(), e))?;

    if metadata.len() > 200 * 1024 * 1024 {
        return Err("File size exceeds the maximum limit of 200MB.".to_string());
    }

    // Read and parse JSON.
    let file_content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read the file: {}", e))?;
    let input_data: InputData =
        serde_json::from_str(&file_content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut output_data = OutputData {
        mod_meta_information: HashMap::new(),
        mod_profiles: HashMap::new(),
    };

    let mut local_mod_lookup: HashMap<String, String> = HashMap::new();
    for (game_key, game_mods) in &input_data.game_to_current_preset {
        let game_info = SUPPORTED_GAMES
            .iter()
            .find(|game| game.schema_name == game_key);
        if game_info.is_none() {
            continue;
        }

        let game_info = game_info.unwrap();
        let app_id = game_info.steam_id;

        output_data
            .mod_meta_information
            .entry(game_key.clone())
            .or_insert_with(Vec::new);
        let mod_info_list = output_data.mod_meta_information.get_mut(game_key).unwrap();

        for m in &game_mods.mods {
            if !m.workshop_id.is_empty() && m.workshop_id.chars().all(char::is_numeric) {
                mod_info_list.push(OutputModInfo {
                    identifier: m.workshop_id.clone(),
                    categories: m.categories.clone().unwrap_or_default().join(", "),
                });
            } else {
                match migrate_local_mod(
                    app_id,
                    &m.path,
                    &m.name,
                    m.categories.clone(),
                    &mod_installation_path,
                ) {
                    Ok(uuid) => {
                        local_mod_lookup.insert(m.path.clone(), uuid.clone());
                        mod_info_list.push(OutputModInfo {
                            identifier: uuid,
                            categories: m.categories.clone().unwrap_or_default().join(", "),
                        });
                    }
                    Err(e) => {
                        eprintln!("Failed to migrate local mod ({}): {}", m.name, e);
                    }
                }
            }
        }
    }

    for (game_key, presets) in &input_data.game_to_presets {
        if !SUPPORTED_GAMES
            .iter()
            .any(|game| game.schema_name == game_key)
        {
            continue;
        }

        let mut output_profiles = Vec::new();
        for profile in presets {
            let mut mods = Vec::new();
            for m in &profile.mods {
                let is_local_mod =
                    m.workshop_id.is_empty() || !m.workshop_id.chars().all(char::is_numeric);
                let identifier = if is_local_mod {
                    if let Some(uuid) = local_mod_lookup.get(&m.path) {
                        uuid.clone()
                    } else {
                        continue;
                    }
                } else {
                    m.workshop_id.clone()
                };

                let title = if is_local_mod {
                    &m.name
                } else {
                    &m.workshop_id
                };

                mods.push(OutputModActive {
                    identifier,
                    title: title.to_string(),
                    pack_file_path: m.path.clone(),
                    is_active: m.is_enabled,
                });
            }
            output_profiles.push(OutputProfile {
                profile_name: profile.name.clone(),
                mods,
            });
        }
        output_data
            .mod_profiles
            .insert(game_key.clone(), output_profiles);
    }

    Ok(output_data)
}

fn is_path_protected(path: &Path) -> bool {
    PROTECTED_PATHS.iter().any(|protected| {
        let protected_path = Path::new(protected);
        path.starts_with(protected_path)
    })
}
