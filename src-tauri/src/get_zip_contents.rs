use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Serialize, Deserialize)]
pub struct FileInfo {
    filename: String,
    filesize: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_zip_contents(zip_file_path: String) -> Result<Vec<FileInfo>, String> {
    if zip_file_path.trim().is_empty() {
        return Err("Archive path cannot be empty".to_string());
    }

    let path = Path::new(&zip_file_path);
    if !path.exists() {
        return Err(format!("Archive file not found: {}", zip_file_path));
    }

    let seven_zip_path = find_7zip_path()
        .ok_or_else(|| "7-Zip is required but was not found. Please install 7-Zip.".to_string())?;

    let output = Command::new(&seven_zip_path)
        .args(["l", "-slt", "-ba", &zip_file_path])
        .output()
        .map_err(|e| format!("Failed to execute 7z: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("7z command failed: {}", error));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);

    let mut files = Vec::new();
    let mut current_filename = String::new();
    let mut current_filesize: u64 = 0;
    let mut is_directory = false;
    let mut is_collecting = false;

    for line in output_str.lines() {
        let line = line.trim();
        if line.is_empty() {
            if is_collecting && !current_filename.is_empty() && !is_directory {
                files.push(FileInfo {
                    filename: current_filename.clone(),
                    filesize: current_filesize,
                });
            }

            current_filename = String::new();
            current_filesize = 0;
            is_directory = false;
            is_collecting = true;
            continue;
        }

        if is_collecting {
            if line.starts_with("Path = ") {
                current_filename = line.trim_start_matches("Path = ").to_string();
            } else if line.starts_with("Size = ") {
                current_filesize = line
                    .trim_start_matches("Size = ")
                    .parse::<u64>()
                    .unwrap_or(0);
            } else if line.starts_with("Folder = ") {
                is_directory = line.trim_start_matches("Folder = ") == "+";
            } else if line.starts_with("Attributes = ") {
                let attrs = line.trim_start_matches("Attributes = ");
                if attrs.contains('D') {
                    is_directory = true;
                }
            }
        }
    }

    if is_collecting && !current_filename.is_empty() && !is_directory {
        files.push(FileInfo {
            filename: current_filename,
            filesize: current_filesize,
        });
    }

    if files.is_empty() {
        return Err(format!(
            "No files found in archive or unsupported archive format: {}",
            zip_file_path
        ));
    }

    Ok(files)
}

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
