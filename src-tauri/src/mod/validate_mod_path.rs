use std::path::Path;

use crate::{pack::has_pack_file::has_pack_file, utils::protected_paths::PROTECTED_PATHS};

pub fn validate_mod_path(
    path: &Path,
    app_id: u32,
    item_id: String,
    check_mod_files: bool,
) -> Result<(), String> {
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
        let pack_file_exists = has_pack_file(path);

        if !mod_info_exists || !pack_file_exists {
            return Err("Directory does not appear to be a valid mod folder".into());
        }
    }

    Ok(())
}
