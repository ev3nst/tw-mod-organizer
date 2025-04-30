use std::path::Path;

pub fn get_drive_letter(path: &Path) -> Option<char> {
    path.as_os_str().to_string_lossy().chars().next()
}
