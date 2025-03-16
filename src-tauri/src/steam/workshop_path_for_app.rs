use std::fs;
use std::path::Path;

use super::steam_paths::steam_paths;

pub fn workshop_path_for_app(app_id: u32) -> Option<String> {
    match steam_paths() {
        Ok(steam_install_paths) => {
            for steam_install_path in steam_install_paths {
                let library_meta_file = Path::new(&steam_install_path)
                    .join("steamapps")
                    .join("libraryfolders.vdf");

                if !library_meta_file.exists() {
                    continue;
                }

                let file_data = match fs::read_to_string(&library_meta_file) {
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
                    let workshop_path = Path::new(lib_path)
                        .join("steamapps")
                        .join("workshop")
                        .join("content")
                        .join(app_id.to_string());

                    if workshop_path.exists() {
                        return Some(workshop_path.to_string_lossy().into_owned());
                    }
                }
            }
            None
        }
        Err(_) => None,
    }
}
