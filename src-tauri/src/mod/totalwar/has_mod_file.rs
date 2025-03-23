use std::{fs::read_dir, path::Path};

pub fn has_mod_file(path: &Path) -> bool {
    if let Ok(entries) = read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() && path.extension().and_then(|ext| ext.to_str()) == Some("pack") {
                    return true;
                }
            }
        }
    }
    false
}
