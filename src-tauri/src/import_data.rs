use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::game::supported_games::SUPPORTED_GAMES;
use crate::pack::migrate_local_mod::migrate_local_mod;
use crate::utils::create_app_default_paths::create_app_default_paths;
use crate::utils::protected_paths::PROTECTED_PATHS;

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct InputMod {
    #[serde(rename = "workshopId")]
    workshop_id: String,
    #[serde(rename = "isEnabled")]
    is_enabled: bool,
    path: String,
    name: String,
    #[serde(rename = "humanName")]
    human_name: String,
    #[serde(default)]
    categories: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct InputModPreset {
    name: String,
    mods: Vec<InputMod>,
}

#[derive(Deserialize)]
struct InputData {
    #[serde(rename = "gameToPresets")]
    game_to_presets: HashMap<String, Vec<InputModPreset>>,
}

#[derive(Serialize)]
struct OutputModInfo {
    identifier: String,
    name: String,
    categories: String,
}

#[derive(Serialize)]
struct OutputModActive {
    identifier: String,
    title: String,
    mod_file_path: String,
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
    app_id: u32,
    json_file_path: String,
    mod_installation_path: String,
) -> Result<OutputData, String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;
    println!("Looking for game slug: {}", game.slug_opt); // Debug print

    if game.r#type != "totalwar" {
        return Err("This game type is not supported for this function".to_string());
    }

    let _ = create_app_default_paths(handle.clone());

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

    let file_content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read the file: {}", e))?;
    let input_data: InputData =
        serde_json::from_str(&file_content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    println!(
        "Available games in JSON: {:?}",
        input_data.game_to_presets.keys()
    );
    let mut output_data = OutputData {
        mod_meta_information: HashMap::new(),
        mod_profiles: HashMap::new(),
    };

    if let Some(presets) = input_data
        .game_to_presets
        .get(&game.slug_opt.to_string().clone())
    {
        println!("Found presets for game: {}", game.slug_opt);
        println!("Number of presets: {}", presets.len());
        let mut output_profiles = Vec::new();
        let mut mod_info_list = Vec::new();
        let mut local_mod_lookup: HashMap<String, String> = HashMap::new();

        for preset in presets {
            let mut mods = Vec::new();

            for m in &preset.mods {
                let identifier = if m.workshop_id.chars().all(char::is_numeric) {
                    m.workshop_id.clone()
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
                            uuid
                        }
                        Err(e) => {
                            eprintln!("Failed to migrate local mod ({}): {}", m.name, e);
                            continue;
                        }
                    }
                };

                if !mod_info_list
                    .iter()
                    .any(|info: &OutputModInfo| info.identifier == identifier)
                {
                    let categories = m.categories.clone().unwrap_or_default().join(", ");
                    if !categories.is_empty() {
                        mod_info_list.push(OutputModInfo {
                            identifier: identifier.clone(),
                            name: m.name.clone(),
                            categories,
                        });
                    }
                }

                mods.push(OutputModActive {
                    identifier,
                    title: m.name.clone(),
                    mod_file_path: m.path.clone(),
                    is_active: m.is_enabled,
                });
            }

            if !mods.is_empty() {
                mods.reverse();
                output_profiles.push(OutputProfile {
                    profile_name: preset.name.clone(),
                    mods,
                });
            }
        }

        if !mod_info_list.is_empty() {
            output_data
                .mod_meta_information
                .insert(game.slug_opt.to_string().clone(), mod_info_list);
        }

        if !output_profiles.is_empty() {
            output_data
                .mod_profiles
                .insert(game.slug_opt.to_string().clone(), output_profiles);
        }
    } else {
        println!("No presets found for game: {}", game.slug_opt);
    }

    Ok(output_data)
}

fn is_path_protected(path: &Path) -> bool {
    PROTECTED_PATHS.iter().any(|protected| {
        let protected_path = Path::new(protected);
        path.starts_with(protected_path)
    })
}
