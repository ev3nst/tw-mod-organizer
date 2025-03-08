use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};

use crate::steam_paths::steam_paths;
use crate::supported_games::SUPPORTED_GAMES;

#[derive(Debug, Serialize, Deserialize)]
pub struct SteamPaths {
    pub library_folder_paths: Vec<String>,
    pub game_install_paths: HashMap<String, String>,
    pub game_workshop_paths: HashMap<String, String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn steam_library_paths() -> Result<SteamPaths, String> {
    let steam_install_paths = steam_paths()?;
    let mut combined_library_folder_paths = Vec::new();
    let mut combined_game_install_paths = HashMap::new();
    let mut combined_game_workshop_paths = HashMap::new();

    for steam_install_path in steam_install_paths {
        let library_meta_file = Path::new(&steam_install_path)
            .join("steamapps")
            .join("libraryfolders.vdf");

        if !library_meta_file.exists() {
            continue;
        }

        let file_data = fs::read_to_string(&library_meta_file)
            .map_err(|e| format!("Failed to read library metadata file: {}", e))?;

        let mut library_folder_paths = Vec::new();
        let re = Regex::new(r#""(.*?)""#).unwrap();
        let matches: Vec<&str> = re.find_iter(&file_data).map(|m| m.as_str()).collect();

        for i in 0..matches.len() {
            let match_str = matches[i].replace("\"", "");
            if match_str == "path" && i + 1 < matches.len() {
                let lib_path = Path::new(&matches[i + 1].replace("\"", ""))
                    .to_str()
                    .unwrap_or("")
                    .to_string();
                library_folder_paths.push(lib_path.replace("\\\\", "\\"));
            }
        }

        combined_library_folder_paths.extend(library_folder_paths.clone());

        let mut game_install_paths = HashMap::new();
        let mut game_workshop_paths = HashMap::new();
        for game in SUPPORTED_GAMES {
            let mut found_path = String::new();
            let mut game_workshop_path = String::new();

            for lib_path in &library_folder_paths {
                let game_install_path = Path::new(lib_path)
                    .join("steamapps")
                    .join("common")
                    .join(&game.steam_folder_name);

                let exe_path = game_install_path.join(format!("{}.exe", game.exe_name));

                if exe_path.exists() {
                    found_path = game_install_path.to_string_lossy().into_owned();
                    game_workshop_path = Path::new(lib_path)
                        .join("steamapps")
                        .join("workshop")
                        .join("content")
                        .join(game.steam_id.to_string())
                        .to_string_lossy()
                        .into_owned();

                    break;
                }
            }

            game_install_paths.insert(game.slug.to_string(), found_path.replace("\\\\", "\\"));
            game_workshop_paths.insert(
                game.slug.to_string(),
                game_workshop_path.replace("\\\\", "\\"),
            );
        }

        combined_game_install_paths.extend(game_install_paths);
        combined_game_workshop_paths.extend(game_workshop_paths);
    }

    Ok(SteamPaths {
        library_folder_paths: combined_library_folder_paths,
        game_install_paths: combined_game_install_paths,
        game_workshop_paths: combined_game_workshop_paths,
    })
}
