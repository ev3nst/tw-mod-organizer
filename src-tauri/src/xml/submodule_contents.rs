use std::{fs::File, io::Read, path::Path};
use xml::reader::{EventReader, XmlEvent};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct DependentModule {
    pub id: String,
    pub dependent_version: Option<String>,
    pub optional: Option<bool>,
}

#[derive(Debug, Clone)]
pub struct SubModuleContents {
    pub id: String,
    pub name: String,
    pub version: Option<String>,
    pub module_type: Option<String>,
    pub depended_modules: Option<Vec<DependentModule>>,
    pub modules_to_load_after_this: Option<Vec<DependentModule>>,
    pub path: String,
}

pub fn submodule_contents(dir_path: &Path) -> Option<SubModuleContents> {
    if !dir_path.exists() {
        return None;
    }

    let submodule_path = dir_path.join("SubModule.xml");
    if !submodule_path.exists() {
        return None;
    }

    let file = File::open(&submodule_path);
    let mod_file_path = submodule_path.to_string_lossy().to_string();

    match file {
        Ok(mut f) => {
            let mut content = String::new();
            if f.read_to_string(&mut content).is_ok() {
                let parser = EventReader::from_str(&content);
                let mut id = String::new();
                let mut name = String::new();
                let mut version = None;
                let mut module_type = None;
                let mut depended_modules = Vec::new();
                let mut modules_to_load_after_this = Vec::new();

                let mut element_stack: Vec<String> = Vec::new();
                let mut current_element = None;

                for e in parser {
                    match e {
                        Ok(XmlEvent::StartElement {
                            name: elem_name,
                            attributes,
                            ..
                        }) => {
                            element_stack.push(elem_name.local_name.clone());
                            match elem_name.local_name.as_str() {
                                "Id" => {
                                    if element_stack.len() == 2 && element_stack[0] == "Module" {
                                        if let Some(attribute) =
                                            attributes.iter().find(|a| a.name.local_name == "value")
                                        {
                                            id = attribute.value.clone();
                                        }
                                    }
                                }
                                "Name" => {
                                    if element_stack.len() == 2 && element_stack[0] == "Module" {
                                        if let Some(attribute) =
                                            attributes.iter().find(|a| a.name.local_name == "value")
                                        {
                                            name = attribute.value.clone();
                                        }
                                    }
                                }
                                "Version" => {
                                    if element_stack.len() == 2 && element_stack[0] == "Module" {
                                        if let Some(attribute) =
                                            attributes.iter().find(|a| a.name.local_name == "value")
                                        {
                                            version = Some(attribute.value.clone());
                                        }
                                    }
                                }
                                "ModuleType" => {
                                    if element_stack.len() == 2 && element_stack[0] == "Module" {
                                        if let Some(attribute) =
                                            attributes.iter().find(|a| a.name.local_name == "value")
                                        {
                                            module_type = Some(attribute.value.clone());
                                        }
                                    }
                                }
                                "DependedModules" => {
                                    current_element = Some("DependedModules");
                                }
                                "ModulesToLoadAfterThis" => {
                                    current_element = Some("ModulesToLoadAfterThis");
                                }
                                "DependedModule" => {
                                    if current_element == Some("DependedModules") {
                                        let mut dep_id = String::new();
                                        let mut dep_version = None;
                                        let mut optional = None;

                                        for attr in &attributes {
                                            match attr.name.local_name.as_str() {
                                                "Id" => dep_id = attr.value.clone(),
                                                "DependentVersion" => {
                                                    dep_version = Some(attr.value.clone())
                                                }
                                                "Optional" => {
                                                    optional =
                                                        Some(attr.value.parse().unwrap_or(false))
                                                }
                                                _ => {}
                                            }
                                        }

                                        depended_modules.push(DependentModule {
                                            id: dep_id,
                                            dependent_version: dep_version,
                                            optional,
                                        });
                                    }
                                }
                                "Module" => {
                                    if current_element == Some("ModulesToLoadAfterThis") {
                                        if let Some(attribute) =
                                            attributes.iter().find(|a| a.name.local_name == "Id")
                                        {
                                            modules_to_load_after_this.push(DependentModule {
                                                id: attribute.value.clone(),
                                                dependent_version: None,
                                                optional: None,
                                            });
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                        Ok(XmlEvent::EndElement { name: _ }) => {
                            if !element_stack.is_empty() {
                                element_stack.pop();
                            }

                            if element_stack.len() == 1 {
                                if current_element == Some("DependedModules")
                                    || current_element == Some("ModulesToLoadAfterThis")
                                {
                                    current_element = None;
                                }
                            }
                        }
                        Err(_) => break,
                        _ => {}
                    }
                }

                return Some(SubModuleContents {
                    id,
                    name,
                    version,
                    module_type,
                    depended_modules: if depended_modules.is_empty() {
                        None
                    } else {
                        Some(depended_modules)
                    },
                    modules_to_load_after_this: if modules_to_load_after_this.is_empty() {
                        None
                    } else {
                        Some(modules_to_load_after_this)
                    },
                    path: mod_file_path,
                });
            }
        }
        Err(_) => return None,
    }

    None
}
