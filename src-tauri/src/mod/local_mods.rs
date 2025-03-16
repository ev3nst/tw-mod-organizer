use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum Version {
    Number(u64),
    Text(String),
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ModItem {
    pub identifier: String,
    pub title: String,
    pub description: Option<String>,
    pub created_at: u64,
    pub categories: Option<String>,
    pub url: Option<String>,
    pub preview_url: Option<String>,
    pub version: Option<Version>,
    pub item_type: String,
    pub pack_file: String,
    pub pack_file_path: String,
    pub preview_local: String,
    pub creator_id: Option<String>,
    pub creator_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ModMeta {
    identifier: String,
    title: String,
    description: Option<String>,
    created_at: u64,
    categories: Option<String>,
    url: Option<String>,
    preview_url: Option<String>,
    version: Option<Version>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn local_mods(
    app_id: u32,
    mod_installation_path: String,
) -> Result<Vec<ModItem>, String> {
    let app_mods_path = PathBuf::from(&mod_installation_path).join(app_id.to_string());
    let mut mods: Vec<ModItem> = vec![];

    if !app_mods_path.exists() {
        return Ok(mods);
    }

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
        let meta: ModMeta = serde_json::from_str(&meta_content).map_err(|e| e.to_string())?;

        let pack_file = match find_pack_file(&mod_path) {
            Some(pack_file) => pack_file,
            None => continue,
        };

        let preview_local = find_image_file(&mod_path).unwrap_or_else(|| "".to_string());

        mods.push(ModItem {
            identifier: meta.identifier,
            title: meta.title,
            description: meta.description,
            created_at: meta.created_at,
            categories: meta.categories,
            url: meta.url,
            preview_url: meta.preview_url,
            version: meta.version,
            item_type: "local_mod".to_string(),
            pack_file: pack_file.file_name().unwrap().to_string_lossy().to_string(),
            pack_file_path: pack_file.to_string_lossy().to_string(),
            preview_local,
            creator_id: None,
            creator_name: Some("".to_string()),
        });
    }

    Ok(mods)
}

fn find_pack_file(mod_path: &Path) -> Option<PathBuf> {
    for entry in fs::read_dir(mod_path).ok()? {
        let entry = entry.ok()?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("pack") {
            return Some(path);
        }
    }
    None
}

fn find_image_file(mod_path: &Path) -> Option<String> {
    for entry in fs::read_dir(mod_path).ok()? {
        let entry = entry.ok()?;
        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|ext| ext.to_str()) {
            if ext == "png" || ext == "jpg" {
                return Some(path.to_string_lossy().to_string());
            }
        }
    }
    None
}
