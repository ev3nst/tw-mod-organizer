use std::{fs::read_to_string, path::Path};

use crate::steam::steam_paths::steam_paths;

pub fn find_installation_path(steam_folder_name: String) -> Option<String> {
    match steam_paths() {
        Ok(steam_install_paths) => {
            for steam_install_path in steam_install_paths {
                let library_meta_file = Path::new(&steam_install_path)
                    .join("steamapps")
                    .join("libraryfolders.vdf");

                if !library_meta_file.exists() {
                    continue;
                }

                let file_data = match read_to_string(&library_meta_file) {
                    Ok(data) => data,
                    Err(_) => continue,
                };

                let re = regex::Regex::new(r#""(.*?)""#).unwrap();
                let matches: Vec<&str> = re.find_iter(&file_data).map(|m| m.as_str()).collect();

                let mut library_folder_paths = Vec::new();
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

                for lib_path in &library_folder_paths {
                    let game_installation_path = Path::new(lib_path)
                        .join("steamapps")
                        .join("common")
                        .join(&steam_folder_name);

                    if game_installation_path.exists() {
                        return Some(game_installation_path.to_string_lossy().into_owned());
                    }
                }
            }
            None
        }
        Err(_) => None,
    }
}
