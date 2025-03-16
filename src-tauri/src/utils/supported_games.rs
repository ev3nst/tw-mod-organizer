use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Game<'a> {
    pub name: &'a str,
    pub slug: &'a str,
    pub save_path_folder: &'a str,
    pub exe_name: &'a str,
    pub steam_id: u64,
    pub steam_folder_name: &'a str,
    pub nexus_slug: &'a str,
    pub schema_name: &'a str,
}

pub const SUPPORTED_GAMES: &[Game] = &[
    Game {
        name: "Total War: WARHAMMER 2",
        slug: "tww2",
        save_path_folder: "Warhammer2",
        exe_name: "Warhammer2",
        steam_id: 594570,
        steam_folder_name: "Total War WARHAMMER II",
        nexus_slug: "totalwarwarhammer2",
        schema_name: "wh2",
    },
    Game {
        name: "Total War: WARHAMMER 3",
        save_path_folder: "Warhammer3",
        exe_name: "Warhammer3",
        slug: "tww3",
        steam_id: 1142710,
        steam_folder_name: "Total War WARHAMMER III",
        nexus_slug: "totalwarwarhammer3",
        schema_name: "wh3",
    },
    Game {
        name: "Total War: Three Kingdoms",
        save_path_folder: "ThreeKingdoms",
        exe_name: "Three_Kingdoms",
        slug: "tw3k",
        steam_id: 779340,
        steam_folder_name: "Total War THREE KINGDOMS",
        nexus_slug: "totalwarthreekingdoms",
        schema_name: "threeKingdoms",
    },
];

#[tauri::command(rename_all = "snake_case")]
pub fn supported_games() -> Result<&'static [Game<'static>], String> {
    Ok(SUPPORTED_GAMES)
}
