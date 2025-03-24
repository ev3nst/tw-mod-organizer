use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::r#mod::base_mods::{LocalModMeta, ModItem};
use crate::xml::submodule_contents::submodule_contents;

pub async fn local_mods(app_mods_path: PathBuf) -> Result<Vec<ModItem>, String> {
    let mut mods: Vec<ModItem> = vec![];

    let mut mod_contents_map = HashMap::new();
    for entry in fs::read_dir(&app_mods_path).map_err(|e| e.to_string())? {
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

        if let Some(submodule_info) = submodule_contents(&mod_path) {
            mod_contents_map.insert(
                submodule_info.id.clone(),
                (submodule_info, meta.identifier.clone()),
            );
        }

        mods.push(ModItem {
            game_specific_id: String::from(""),
            identifier: meta.identifier.clone(),
            title: meta.title.clone(),
            description: meta.description,
            created_at: meta.created_at,
            categories: meta.categories,
            url: meta.url,
            download_url: meta.download_url,
            preview_url: meta.preview_url,
            version: meta.version,
            item_type: "local_mod".to_string(),
            mod_file: meta.title,
            mod_file_path: mod_path.to_string_lossy().to_string(),
            preview_local: "".to_string(),
            creator_id: None,
            creator_name: Some("".to_string()),
            required_items: vec![],
            child_mods: vec![],
        });
    }

    for mod_item in &mut mods {
        if let Some(mod_id) = mod_contents_map
            .iter()
            .find(|(_, (_, identifier))| identifier == &mod_item.identifier)
            .map(|(id, _)| id.clone())
        {
            if let Some((submodule_info, _)) = mod_contents_map.get(&mod_id) {
                mod_item.game_specific_id = submodule_info.id.clone();
                if let Some(ref depended_modules) = submodule_info.depended_modules {
                    for dep in depended_modules {
                        if let Some((_, identifier)) = mod_contents_map.get(&dep.id) {
                            mod_item.required_items.push(identifier.clone());
                        } else {
                            mod_item.required_items.push(dep.id.clone());
                        }
                    }
                }

                if let Some(ref modules_to_load_after) = submodule_info.modules_to_load_after_this {
                    for child in modules_to_load_after {
                        if let Some((_, identifier)) = mod_contents_map.get(&child.id) {
                            mod_item.child_mods.push(identifier.clone());
                        } else {
                            mod_item.child_mods.push(child.id.clone());
                        }
                    }
                }
            }
        }
    }

    Ok(mods)
}
