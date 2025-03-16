use std::{env, path::PathBuf};

pub fn roaming_folder() -> Option<PathBuf> {
    if let Ok(home_dir) = env::var("USERPROFILE") {
        let mut path = PathBuf::from(home_dir);
        path.push("AppData\\Roaming");
        Some(path)
    } else {
        None
    }
}
