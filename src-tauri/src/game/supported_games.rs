use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::utils::roaming_folder::roaming_folder;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Game {
    pub name: &'static str,
    pub slug: &'static str,
    pub save_path_folder_name: &'static str,
    pub save_file_extension: &'static str,
    pub exe_name: &'static str,
    pub exe_folder: &'static str,
    pub steam_id: u32,
    pub steam_folder_name: &'static str,
    pub nexus_slug: &'static str,
    pub r#type: &'static str,
}

pub const SUPPORTED_GAMES: &[Game] = &[
    Game {
        name: "Total War: WARHAMMER 2",
        slug: "tww2",
        save_path_folder_name: "Warhammer2",
        save_file_extension: "save",
        exe_name: "Warhammer2",
        exe_folder: "",
        steam_id: 594570,
        steam_folder_name: "Total War WARHAMMER II",
        nexus_slug: "totalwarwarhammer2",
        r#type: "totalwar",
    },
    Game {
        name: "Total War: WARHAMMER 3",
        slug: "tww3",
        save_path_folder_name: "Warhammer3",
        save_file_extension: "save",
        exe_name: "Warhammer3",
        exe_folder: "",
        steam_id: 1142710,
        steam_folder_name: "Total War WARHAMMER III",
        nexus_slug: "totalwarwarhammer3",
        r#type: "totalwar",
    },
    Game {
        name: "Total War: Three Kingdoms",
        slug: "tw3k",
        save_path_folder_name: "ThreeKingdoms",
        save_file_extension: "save",
        exe_name: "Three_Kingdoms",
        exe_folder: "",
        steam_id: 779340,
        steam_folder_name: "Total War THREE KINGDOMS",
        nexus_slug: "totalwarthreekingdoms",
        r#type: "totalwar",
    },
    Game {
        name: "Mount & Blade: Bannerlord",
        slug: "mbbl",
        save_path_folder_name: "Mount and Blade II Bannerlord",
        save_file_extension: "sav",
        exe_name: "Bannerlord",
        exe_folder: "bin\\Win64_Shipping_Client",
        steam_id: 261550,
        steam_folder_name: "Mount & Blade II Bannerlord",
        nexus_slug: "mountandblade2bannerlord",
        r#type: "bannerlord",
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

#[tauri::command(rename_all = "snake_case")]
pub fn supported_games() -> Result<&'static [Game], String> {
    Ok(SUPPORTED_GAMES)
}
