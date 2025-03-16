use std::{fs::read_dir, path::Path};

pub fn find_pack_and_image(dir_path: &Path) -> (String, String, String) {
    if !dir_path.exists() {
        return (String::new(), String::new(), String::new());
    }

    let mut pack_file = (String::new(), String::new());
    let mut image_file = String::new();

    if let Ok(entries) = read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_file() {
                if path.extension().map_or(false, |ext| ext == "pack") {
                    pack_file = (
                        path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string(),
                        path.to_string_lossy().to_string(),
                    );
                }
                if image_file.is_empty()
                    && path
                        .extension()
                        .map_or(false, |ext| matches!(ext.to_str(), Some("jpg" | "png")))
                {
                    image_file = path.to_string_lossy().to_string();
                }
            }

            if !pack_file.0.is_empty() && !image_file.is_empty() {
                break;
            }
        }
    }

    (pack_file.0, pack_file.1, image_file)
}
