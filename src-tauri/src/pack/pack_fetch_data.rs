use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rpfm_lib::files::{pack::Pack, Container, FileType, RFileDecoded};
use serde::Serialize;
use serde_json::{json, Value};
use std::path::PathBuf;

use crate::utils::convert_dds_to_png::convert_dds_to_png;

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
            RFileDecoded::VMD(vmd) => Some(FileContent {
                file_type: "vmd".to_string(),
                content: Value::String(vmd.contents().to_string()),
            }),
            RFileDecoded::WSModel(ws_model) => Some(FileContent {
                file_type: "ws_model".to_string(),
                content: Value::String(ws_model.contents().to_string()),
            }),
            RFileDecoded::Image(image) => {
                let (image_data, mime_type) = if path_in_container.ends_with(".dds") {
                    let dds_data = image.data();
                    let png_data = convert_dds_to_png(dds_data)?;
                    (png_data, "image/png")
                } else {
                    (
                        image.data().to_vec(),
                        match path_in_container.split('.').last() {
                            Some("png") => "image/png",
                            Some("jpg") | Some("jpeg") => "image/jpeg",
                            _ => "image/png",
                        },
                    )
                };

                Some(FileContent {
                    file_type: "image".to_string(),
                    content: Value::String(format!(
                        "data:{};base64,{}",
                        mime_type,
                        BASE64.encode(&image_data)
                    )),
                })
            }
            RFileDecoded::Video(video) => Some(FileContent {
                file_type: "video".to_string(),
                content: json!({
                    "format": format!("{:#?}", video.format()),
                    "version": video.version(),
                    "codec": video.codec_four_cc(),
                    "width": video.width(),
                    "height": video.height(),
                    "frames": video.num_frames(),
                    "framerate": video.framerate()
                }),
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
