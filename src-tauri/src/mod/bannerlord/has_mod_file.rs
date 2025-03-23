use std::{fs::read_dir, path::Path};

pub fn has_mod_file(path: &Path) -> bool {
    if let Ok(entries) = read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file()
                    && path.file_name().and_then(|name| name.to_str()) == Some("SubModule.xml")
                {
                    return true;
                }
            }
        }
    }
    false
}
