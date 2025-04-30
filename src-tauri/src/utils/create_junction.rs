use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;

use super::get_drive_letter::get_drive_letter;

pub fn create_junction(source: &Path, target: &Path) -> Result<bool, String> {
    if get_drive_letter(source) != get_drive_letter(target) {
        return Ok(false);
    }

    let output = Command::new("cmd")
        .creation_flags(0x08000000)
        .args([
            "/C",
            "mklink",
            "/J",
            &target.to_string_lossy(),
            &source.to_string_lossy(),
        ])
        .output()
        .map_err(|e| format!("Failed to execute mklink: {}", e))?;

    Ok(output.status.success())
}
