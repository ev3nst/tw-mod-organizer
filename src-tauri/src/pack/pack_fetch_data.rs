use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rpfm_lib::files::{pack::Pack, Container, FileType, RFileDecoded};
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct FileContent {
    #[serde(rename = "type")]
    file_type: String,
    content: Value,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pack_fetch_data(
    pack_file_path: String,
    path_in_container: String,
) -> Result<Option<FileContent>, String> {
    let pack_file_path = PathBuf::from(pack_file_path);
    if !pack_file_path.exists() {
        return Err(format!("Pack file does not exist: {:?}", pack_file_path));
    }

    if pack_file_path.extension().map_or(true, |ext| ext != "pack") {
        return Err(format!("File is not a .pack file: {:?}", pack_file_path));
    }

    let mut packfile = Pack::read_and_merge(&[pack_file_path.clone()], true, false, false)
        .map_err(|e| format!("Failed to read pack file: {:?}", e))?;

    let file = packfile
        .file_mut(&path_in_container, false)
        .ok_or_else(|| format!("File not found in pack: {}", path_in_container))?;

    match file.file_type() {
        FileType::DB | FileType::Loc => {
            return Ok(None);
        }
        _ => {}
    }

    let content = match file.decode(&None, false, true) {
        Ok(Some(decoded)) => match decoded {
            RFileDecoded::Text(text) => Some(FileContent {
                file_type: "text".to_string(),
                content: Value::String(text.contents().to_string()),
            }),
            RFileDecoded::Image(image) => Some(FileContent {
                file_type: "image".to_string(),
                content: Value::String(format!(
                    "data:image/png;base64,{}",
                    BASE64.encode(image.data())
                )),
            }),
            RFileDecoded::Video(video) => Some(FileContent {
                file_type: "video".to_string(),
                content: Value::String(BASE64.encode(video.frame_data())),
            }),
            RFileDecoded::AnimsTable(anims) => Some(FileContent {
                file_type: "anims_table".to_string(),
                content: serde_json::to_value(anims)
                    .map_err(|e| format!("Failed to serialize ANIMS data: {}", e))?,
            }),
            RFileDecoded::ESF(esf) => Some(FileContent {
                file_type: "esf".to_string(),
                content: serde_json::to_value(esf)
                    .map_err(|e| format!("Failed to serialize ESF data: {}", e))?,
            }),
            RFileDecoded::UnitVariant(unit) => Some(FileContent {
                file_type: "unit_variant".to_string(),
                content: serde_json::to_value(unit)
                    .map_err(|e| format!("Failed to serialize unit variant data: {}", e))?,
            }),
            _ => Some(FileContent {
                file_type: "binary".to_string(),
                content: Value::String("Binary file".to_string()),
            }),
        },
        Ok(None) => Some(FileContent {
            file_type: "empty".to_string(),
            content: Value::String("Empty file".to_string()),
        }),
        Err(e) => Some(FileContent {
            file_type: "error".to_string(),
            content: Value::String(format!("Failed to decode file: {:?}", e)),
        }),
    };

    Ok(content)
}
