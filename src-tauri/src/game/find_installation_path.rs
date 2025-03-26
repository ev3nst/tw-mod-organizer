use super::supported_games::Game;
use crate::steam::steam_paths::steam_paths;
use regex::Regex;
use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn find_installation_path(game: Game) -> Option<String> {
    let steam_install_paths = steam_paths().ok()?;
    let re = Regex::new(r#"path"\s*"(.*?)""#).ok()?;

    for steam_install_path in steam_install_paths {
        let library_meta_file = Path::new(&steam_install_path)
            .join("steamapps")
            .join("libraryfolders.vdf");

        if !library_meta_file.exists() {
            continue;
        }

        let file_data = fs::read_to_string(&library_meta_file).ok()?;
        let library_folder_paths: Vec<PathBuf> = re
            .captures_iter(&file_data)
            .filter_map(|cap| cap.get(1))
            .map(|m| PathBuf::from(m.as_str().replace("\\", "\\")))
            .collect();

        for lib_path in library_folder_paths {
            let game_installation_path = lib_path
                .join("steamapps/common")
                .join(&game.steam_folder_name);
            let mut exe_path = game_installation_path.clone();

            if !game.exe_folder.is_empty() {
                exe_path.push(&game.exe_folder);
            }

            exe_path.push(format!("{}.exe", game.exe_name));

            if exe_path.exists() && exe_path.is_file() {
                return Some(game_installation_path.to_string_lossy().into_owned());
            }
        }
    }
    None
}
