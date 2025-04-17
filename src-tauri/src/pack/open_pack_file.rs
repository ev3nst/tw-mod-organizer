use std::{
    os::windows::process::CommandExt,
    process::Command,
};

#[tauri::command(rename_all = "snake_case")]
pub fn open_pack_file(pack_file_path: String) -> Result<(), String> {
    if !pack_file_path.ends_with(".pack") {
        return Err("The file must have a .pack extension".to_string());
    }

    let result = Command::new("cmd")
        .creation_flags(0x08000000)
        .args(&["/C", "start", "", &pack_file_path])
        .output();

    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                Err("Failed to open the file".to_string())
            }
        }
        Err(e) => Err(format!("Error opening file: {}", e)),
    }
}
