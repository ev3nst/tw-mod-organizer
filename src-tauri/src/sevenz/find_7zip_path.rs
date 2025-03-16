use winreg::{enums::HKEY_LOCAL_MACHINE, RegKey};

pub fn find_7zip_path() -> Option<String> {
    let common_paths = [
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
    ];

    for path in common_paths.iter() {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    for key_path in [r"SOFTWARE\7-Zip", r"SOFTWARE\WOW6432Node\7-Zip"].iter() {
        if let Ok(key) = hklm.open_subkey(key_path) {
            if let Ok(path) = key.get_value::<String, _>("Path") {
                let full_path = format!("{}\\7z.exe", path.trim_end_matches('\\'));
                if std::path::Path::new(&full_path).exists() {
                    return Some(full_path);
                }
            }
        }
    }

    None
}
