use std::fs;
use std::path::PathBuf;

use crate::r#mod::base_mods::{LocalModMeta, ModItem};

use super::find_mod_file_and_image::find_mod_file_and_image;

pub async fn local_mods(app_mods_path: PathBuf) -> Result<Vec<ModItem>, String> {
    let mut mods: Vec<ModItem> = vec![];
    for entry in fs::read_dir(app_mods_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let mod_path = entry.path();

        if !mod_path.is_dir() {
            continue;
        }

        let meta_path = mod_path.join("meta.json");
        if !meta_path.exists() {
            continue;
        }

        let meta_content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
        let meta: LocalModMeta = serde_json::from_str(&meta_content).map_err(|e| e.to_string())?;

        let mod_file_and_images_paths = find_mod_file_and_image(&mod_path);

        mods.push(ModItem {
            game_specific_id: String::from(""),
            identifier: meta.identifier,
            title: meta.title,
            description: meta.description,
            created_at: meta.created_at,
            updated_at: Some(meta.updated_at.unwrap_or(meta.created_at)),
            categories: meta.categories,
            url: meta.url,
            download_url: meta.download_url,
            preview_url: meta.preview_url,
            version: meta.version,
            item_type: "local_mod".to_string(),
            mod_file: mod_file_and_images_paths.0,
            mod_file_path: mod_file_and_images_paths.1,
            preview_local: mod_file_and_images_paths.2,
            creator_id: None,
            creator_name: Some("".to_string()),
            required_items: vec![],
            child_mods: vec![],
        });
    }

    Ok(mods)
}
