use std::path::Path;

use crate::{game::supported_games::SUPPORTED_GAMES, utils::protected_paths::PROTECTED_PATHS};

use super::bannerlord;
use super::totalwar;

pub fn validate_mod_path(
    path: &Path,
    app_id: u32,
    item_id: String,
    check_mod_files: bool,
) -> Result<(), String> {
    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let path_str = path.to_string_lossy();
    for protected in PROTECTED_PATHS {
        if path_str.starts_with(protected) {
            return Err(format!(
                "Access to protected path '{}' is forbidden",
                protected
            ));
        }
    }

    let expected_suffix = format!("{}\\{}", app_id, item_id);
    if !path_str.ends_with(&expected_suffix) {
        return Err(format!(
            "Path does not match expected folder structure: {}",
            path_str
        ));
    }

    if check_mod_files {
        let mod_info_exists = path.join("meta.json").exists();

        match game.r#type.as_ref() {
            "totalwar" => {
                let mod_file_exists = totalwar::has_mod_file::has_mod_file(path);
                if !mod_info_exists || !mod_file_exists {
                    return Err("Directory does not appear to be a valid mod folder".to_owned());
                }
                Ok(())
            }
            "bannerlord" => {
                let mod_file_exists = bannerlord::has_mod_file::has_mod_file(path);
                if !mod_info_exists || !mod_file_exists {
                    return Err("Directory does not appear to be a valid mod folder".to_owned());
                }
                Ok(())
            }
            _ => Err(format!("Game type '{}' is not supported", game.r#type)),
        }?;
    }

    Ok(())
}
