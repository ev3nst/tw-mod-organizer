use rayon::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::BufReader,
    path::{Path, PathBuf},
    time::SystemTime,
};
use tauri::path::BaseDirectory;
use tauri::Manager;
use tokio::task;
use xml::reader::{EventReader, XmlEvent};

use crate::r#mod::conflicts::FileMetadata;

#[derive(Serialize, Deserialize)]
struct CacheEntry {
    file_paths: Vec<String>,
    file_metadata: BTreeMap<String, FileMetadata>,
    conflicts: BTreeMap<String, BTreeMap<String, Vec<String>>>,
}

#[allow(dead_code)]
#[derive(Debug)]
struct ElementInfo {
    element_type: String,
    id: String,
    source_file: PathBuf,
    full_path: String,
}

fn strip_localization_tags(text: &str) -> String {
    let re = Regex::new(r"\{=[^}]+\}").unwrap_or_else(|_| Regex::new(r"\{=[^}]*\}").unwrap());
    re.replace_all(text, "").to_string()
}

pub async fn conflicts(
    handle: tauri::AppHandle,
    app_id: u32,
    folder_paths: Vec<String>,
) -> Result<BTreeMap<String, BTreeMap<String, Vec<String>>>, String> {
    let app_cache_dir = handle
        .path()
        .resolve("cache".to_string(), BaseDirectory::AppConfig)
        .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?;

    if !app_cache_dir.exists() {
        fs::create_dir_all(&app_cache_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let cache_json_filename = format!("mod_conflicts_{}_cache.json", app_id);
    let cache_file = app_cache_dir.join(cache_json_filename);

    let excluded_elements: BTreeSet<&str> = ["LanguageData", "Module", "XmlNode", "string"]
        .iter()
        .cloned()
        .collect();

    let mut mod_folders: BTreeMap<PathBuf, String> = BTreeMap::new();
    for folder_path in &folder_paths {
        let path = Path::new(folder_path);
        if path.is_dir() {
            collect_mod_folders(path, &mut mod_folders, 0, 4)?;
        }
    }

    let mut xml_files: Vec<PathBuf> = mod_folders
        .keys()
        .flat_map(|mod_folder| collect_xml_files(mod_folder, 0, 4).unwrap_or_default())
        .collect();
    xml_files.sort();

    let file_paths: Vec<String> = xml_files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    let file_metadata: BTreeMap<String, FileMetadata> = xml_files
        .par_iter()
        .filter_map(|path| {
            let metadata = fs::metadata(path).ok()?;
            let modified = metadata
                .modified()
                .ok()?
                .duration_since(SystemTime::UNIX_EPOCH)
                .ok()?
                .as_secs();
            Some((
                path.to_string_lossy().to_string(),
                FileMetadata {
                    size: metadata.len(),
                    modified,
                },
            ))
        })
        .collect();

    if cache_file.exists() {
        let cache_content = fs::read_to_string(&cache_file).ok();
        if let Some(content) = cache_content {
            if let Ok(cache_entry) = serde_json::from_str::<CacheEntry>(&content) {
                let file_paths_set: BTreeSet<_> = file_paths.iter().cloned().collect();
                let cached_paths_set: BTreeSet<_> =
                    cache_entry.file_paths.iter().cloned().collect();

                if file_paths_set == cached_paths_set {
                    let all_files_unchanged = file_metadata.iter().all(|(path, metadata)| {
                        cache_entry
                            .file_metadata
                            .get(path)
                            .map_or(false, |cached| cached == metadata)
                    });

                    if all_files_unchanged {
                        return Ok(cache_entry.conflicts);
                    }
                }
            }
        }
    }

    let mod_folders_clone = mod_folders.clone();
    let excluded_elements_clone = excluded_elements.clone();
    let conflicts_result = task::spawn_blocking(move || {
        let element_map: BTreeMap<(String, String), Vec<(PathBuf, PathBuf, String)>> = xml_files
            .par_iter()
            .filter_map(|file_path| {
                let mod_path = find_parent_mod(&mod_folders_clone, file_path)?;
                let elements = parse_xml_file_with_paths(file_path).unwrap_or_default();
                Some((mod_path.clone(), file_path.clone(), elements))
            })
            .fold(
                || BTreeMap::new(),
                |mut acc: BTreeMap<(String, String), Vec<(PathBuf, PathBuf, String)>>,
                 (mod_path, file_path, elements)| {
                    for element in elements {
                        if excluded_elements_clone.contains(element.element_type.as_str()) {
                            continue;
                        }
                        let key = (element.element_type.clone(), element.id.clone());
                        acc.entry(key).or_default().push((
                            mod_path.clone(),
                            file_path.clone(),
                            element.full_path.clone(),
                        ));
                    }
                    acc
                },
            )
            .reduce(
                || BTreeMap::new(),
                |mut a, b| {
                    for (key, mut values) in b {
                        a.entry(key).or_default().append(&mut values);
                    }
                    a
                },
            );

        let mut conflicts_by_mod: BTreeMap<String, BTreeMap<String, Vec<String>>> = BTreeMap::new();
        for ((element_type, _id), mod_files) in element_map {
            let mut mods_map: BTreeMap<PathBuf, Vec<(PathBuf, String)>> = BTreeMap::new();
            for (mod_path, file_path, full_path) in mod_files {
                mods_map
                    .entry(mod_path)
                    .or_default()
                    .push((file_path, full_path));
            }

            let mod_paths: Vec<PathBuf> = mods_map.keys().cloned().collect();
            if mod_paths.len() > 1 {
                for i in 0..mod_paths.len() {
                    for j in (i + 1)..mod_paths.len() {
                        let mod1 = &mod_paths[i];
                        let mod2 = &mod_paths[j];

                        if excluded_elements_clone.contains(element_type.as_str()) {
                            continue;
                        }

                        let full_path1 = &mods_map.get(mod1).unwrap()[0].1;
                        let mod1_str = mod1.to_string_lossy().to_string();
                        let mod2_str = mod2.to_string_lossy().to_string();

                        conflicts_by_mod
                            .entry(mod1_str)
                            .or_default()
                            .entry(mod2_str)
                            .or_default()
                            .push(full_path1.clone());
                    }
                }
            }
        }

        conflicts_by_mod
    })
    .await
    .map_err(|e| format!("Task failed: {:?}", e))?;

    let cache_entry = CacheEntry {
        file_paths,
        file_metadata,
        conflicts: conflicts_result.clone(),
    };

    let cache_json = serde_json::to_string(&cache_entry)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;

    fs::write(&cache_file, cache_json).map_err(|e| format!("Failed to write cache file: {}", e))?;

    Ok(conflicts_result)
}

fn collect_mod_folders(
    dir: &Path,
    mod_folders: &mut BTreeMap<PathBuf, String>,
    current_depth: u32,
    max_depth: u32,
) -> Result<(), String> {
    if current_depth > max_depth || !dir.is_dir() {
        return Ok(());
    }

    let submodule_path = dir.join("SubModule.xml");
    if submodule_path.exists() {
        let mod_name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Mod")
            .to_string();

        if let Ok(content) = fs::read_to_string(&submodule_path) {
            if let Some(name) = extract_mod_name_from_submodule(&content) {
                mod_folders.insert(dir.to_path_buf(), name);
                return Ok(());
            }
        }

        mod_folders.insert(dir.to_path_buf(), mod_name);
        return Ok(());
    }

    match fs::read_dir(dir) {
        Ok(entries) => {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                if path.is_dir() {
                    collect_mod_folders(&path, mod_folders, current_depth + 1, max_depth)?;
                }
            }
            Ok(())
        }
        Err(e) => Err(format!("Failed to read directory {}: {}", dir.display(), e)),
    }
}

fn extract_mod_name_from_submodule(content: &str) -> Option<String> {
    let parser = EventReader::new(content.as_bytes());
    let mut in_name = false;

    for event in parser {
        match event {
            Ok(XmlEvent::StartElement { name, .. }) if name.local_name == "Name" => {
                in_name = true;
            }
            Ok(XmlEvent::Characters(text)) if in_name => {
                return Some(text);
            }
            Ok(XmlEvent::EndElement { name }) if name.local_name == "Name" => {
                in_name = false;
            }
            Ok(XmlEvent::EndDocument) | Err(_) => break,
            _ => {}
        }
    }

    None
}

fn collect_xml_files(
    dir: &Path,
    current_depth: u32,
    max_depth: u32,
) -> Result<Vec<PathBuf>, String> {
    if current_depth > max_depth || !dir.is_dir() {
        return Ok(vec![]);
    }

    let mut result = Vec::new();
    match fs::read_dir(dir) {
        Ok(entries) => {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                if path.is_dir() {
                    let mut sub_results = collect_xml_files(&path, current_depth + 1, max_depth)?;
                    result.append(&mut sub_results);
                } else if path.extension().map_or(false, |ext| ext == "xml") {
                    if path
                        .file_name()
                        .map_or(false, |name| name == "SubModule.xml")
                    {
                        continue;
                    }
                    result.push(path);
                }
            }
            Ok(result)
        }
        Err(e) => Err(format!("Failed to read directory {}: {}", dir.display(), e)),
    }
}

fn find_parent_mod<'a>(
    mod_folders: &'a BTreeMap<PathBuf, String>,
    file_path: &Path,
) -> Option<&'a PathBuf> {
    for mod_path in mod_folders.keys() {
        if file_path.starts_with(mod_path) {
            return Some(mod_path);
        }
    }
    None
}

fn parse_xml_file_with_paths(file_path: &Path) -> Result<Vec<ElementInfo>, String> {
    let file = fs::File::open(file_path)
        .map_err(|e| format!("Failed to open XML file {}: {}", file_path.display(), e))?;
    let file = BufReader::new(file);
    let parser = EventReader::new(file);
    let mut elements = Vec::new();
    let mut path_stack: Vec<String> = Vec::new();

    for event in parser {
        match event {
            Ok(XmlEvent::StartElement {
                name, attributes, ..
            }) => {
                let element_type = name.local_name;
                let mut id_value = String::new();
                let mut name_value = String::new();

                for attr in &attributes {
                    if attr.name.local_name == "id" {
                        id_value = attr.value.clone();
                    } else if attr.name.local_name == "name" {
                        name_value = strip_localization_tags(&attr.value);
                    }
                }

                let path_element = if !id_value.is_empty() {
                    if !name_value.is_empty() {
                        format!("{}:{}:{}", element_type, id_value, name_value)
                    } else {
                        format!("{}:{}", element_type, id_value)
                    }
                } else {
                    element_type.clone()
                };

                path_stack.push(path_element);
                if !id_value.is_empty() {
                    let full_path = path_stack.join(" -> ");
                    elements.push(ElementInfo {
                        element_type,
                        id: id_value,
                        source_file: file_path.to_path_buf(),
                        full_path,
                    });
                }
            }
            Ok(XmlEvent::EndElement { .. }) => {
                path_stack.pop();
            }
            Err(e) => {
                return Err(format!(
                    "Error parsing XML file {}: {}",
                    file_path.display(),
                    e
                ));
            }
            _ => {}
        }
    }

    Ok(elements)
}
