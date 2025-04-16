use rpfm_lib::files::pack::Pack;
use rpfm_lib::files::{Container, DecodeableExtraData, FileType, RFileDecoded};
use rpfm_lib::schema::Schema;
use std::env;
use std::path::PathBuf;

use crate::game::supported_games::SUPPORTED_GAMES;

#[tauri::command(rename_all = "snake_case")]
pub async fn pack_db_data(
    app_id: u32,
    pack_file_path: String,
) -> Result<std::collections::HashMap<String, serde_json::Value>, String> {
    let pack_file_path = PathBuf::from(pack_file_path);
    if !pack_file_path.exists() {
        return Err(format!("Pack file does not exist: {:?}", pack_file_path));
    }

    if pack_file_path.extension().map_or(true, |ext| ext != "pack") {
        return Err(format!("File is not a .pack file: {:?}", pack_file_path));
    }

    let game = SUPPORTED_GAMES
        .iter()
        .find(|game| game.steam_id == app_id)
        .ok_or_else(|| format!("Given app_id {} is not supported", app_id))?;

    let exe_path = env::current_exe().unwrap();
    let exe_dir = exe_path.parent().unwrap().to_str().unwrap();

    let schema_file_path = PathBuf::from(exe_dir).join(game.schema_file);
    let schema = Schema::load(&schema_file_path, None)
        .map_err(|e| format!("Failed to load schema: {}", e))?;

    let mut packfile = Pack::read_and_merge(&[pack_file_path], true, false, false)
        .map_err(|e| format!("Failed to read pack file: {:?}", e))?;

    let db_files = packfile.files_by_type_mut(&[FileType::DB]);
    if db_files.is_empty() {
        return Ok(std::collections::HashMap::new());
    }

    let mut decode_extra_data = DecodeableExtraData::default();
    decode_extra_data.set_schema(Some(&schema));
    let extra_data = Some(decode_extra_data);

    let mut table_data_map = std::collections::HashMap::new();

    for file in db_files {
        match file.decode(&extra_data, false, true) {
            Ok(Some(decoded)) => {
                if let RFileDecoded::DB(table_data) = decoded {
                    table_data_map.insert(
                        file.path_in_container().path_raw().to_owned(),
                        serde_json::to_value(table_data.table())
                            .map_err(|e| format!("Failed to serialize table data: {}", e))?,
                    );
                }
            }
            Ok(None) => println!("File could not be decoded: {:?}", file.path_in_container()),
            Err(e) => println!("Error decoding file {:?}: {}", file.path_in_container(), e),
        }
    }

    Ok(table_data_map)
}
