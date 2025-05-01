use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::utils::roaming_folder::roaming_folder;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Game {
    pub name: &'static str,
    pub slug: &'static str,
    pub slug_opt: &'static str,
    pub save_path_folder_name: &'static str,
    pub save_file_extension: &'static str,
    pub exe_name: &'static str,
    pub exe_folder: &'static str,
    pub steam_id: u32,
    pub steam_folder_name: &'static str,
    pub nexus_slug: &'static str,
    pub nexus_id: u128,
    pub r#type: &'static str,
    pub schema_file: &'static str,
}

pub const SUPPORTED_GAMES: &[Game] = &[
    Game {
        name: "Total War: WARHAMMER 2",
        slug: "tww2",
        slug_opt: "wh2",
        save_path_folder_name: "Warhammer2",
        save_file_extension: "save",
        exe_name: "Warhammer2",
        exe_folder: "",
        steam_id: 594570,
        steam_folder_name: "Total War WARHAMMER II",
        nexus_slug: "totalwarwarhammer2",
        nexus_id: 2436,
        r#type: "totalwar",
        schema_file: "schema_wh2.ron",
    },
    Game {
        name: "Total War: WARHAMMER 3",
        slug: "tww3",
        slug_opt: "wh3",
        save_path_folder_name: "Warhammer3",
        save_file_extension: "save",
        exe_name: "Warhammer3",
        exe_folder: "",
        steam_id: 1142710,
        steam_folder_name: "Total War WARHAMMER III",
        nexus_slug: "totalwarwarhammer3",
        nexus_id: 4717,
        r#type: "totalwar",
        schema_file: "schema_wh3.ron",
    },
    Game {
        name: "Total War: Three Kingdoms",
        slug: "tw3k",
        slug_opt: "threeKingdoms",
        save_path_folder_name: "ThreeKingdoms",
        save_file_extension: "save",
        exe_name: "Three_Kingdoms",
        exe_folder: "",
        steam_id: 779340,
        steam_folder_name: "Total War THREE KINGDOMS",
        nexus_slug: "totalwarthreekingdoms",
        nexus_id: 2847,
        r#type: "totalwar",
        schema_file: "schema_3k.ron",
    },
    Game {
        name: "Mount & Blade: Bannerlord",
        slug: "mbbl",
        slug_opt: "mbbl",
        save_path_folder_name: "Mount and Blade II Bannerlord",
        save_file_extension: "sav",
        exe_name: "Bannerlord",
        exe_folder: "bin\\Win64_Shipping_Client",
        steam_id: 261550,
        steam_folder_name: "Mount & Blade II Bannerlord",
        nexus_slug: "mountandblade2bannerlord",
        nexus_id: 3174,
        r#type: "bannerlord",
        schema_file: "",
    },
];

impl Game {
    pub fn save_path_folder(&self) -> Result<String, String> {
        match self.r#type {
            "totalwar" => {
                let roaming_folder = roaming_folder()
                    .ok_or_else(|| "Roaming folder could not be resolved.".to_string())?;
                let save_folder_path = Path::new(&roaming_folder)
                    .join("The Creative Assembly")
                    .join(self.save_path_folder_name)
                    .join("save_games");
                Ok(save_folder_path.to_string_lossy().to_string())
            }
            "bannerlord" => {
                let documents = dirs::document_dir()
                    .ok_or_else(|| "Documents folder could not be resolved.".to_string())?;
                let save_folder_path = documents
                    .join(self.save_path_folder_name)
                    .join("Game Saves");
                Ok(save_folder_path.to_string_lossy().to_string())
            }
            _ => Err(format!("Unsupported game type: {}", self.r#type)),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct GameWithPath<'a> {
    pub name: &'a str,
    pub slug: &'a str,
    pub slug_opt: &'a str,
    pub save_path_folder: Option<String>,
    pub save_file_extension: &'a str,
    pub exe_name: &'a str,
    pub exe_folder: &'a str,
    pub steam_id: u32,
    pub steam_folder_name: &'a str,
    pub nexus_slug: &'a str,
    pub nexus_id: u128,
    pub r#type: &'a str,
    pub schema_file: &'a str,
}

#[tauri::command(rename_all = "snake_case")]
pub fn supported_games() -> Result<Vec<GameWithPath<'static>>, String> {
    let mut games_with_paths = Vec::new();

    for game in SUPPORTED_GAMES.iter() {
        let path_result = game.save_path_folder().ok();
        games_with_paths.push(GameWithPath {
            name: game.name,
            slug: game.slug,
            slug_opt: game.slug_opt,
            save_path_folder: path_result,
            save_file_extension: game.save_file_extension,
            exe_name: game.exe_name,
            exe_folder: game.exe_folder,
            steam_id: game.steam_id,
            steam_folder_name: game.steam_folder_name,
            nexus_slug: game.nexus_slug,
            nexus_id: game.nexus_id,
            r#type: game.r#type,
            schema_file: game.schema_file,
        });
    }

    Ok(games_with_paths)
}
