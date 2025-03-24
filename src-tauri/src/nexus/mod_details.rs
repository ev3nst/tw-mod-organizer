use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModDetailsRequestOptions {
    pub game_domain_name: String,
    pub mod_id: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModDetails {
    pub name: String,
    pub summary: String,
    pub description: String,
    pub picture_url: String,
    pub mod_downloads: u32,
    pub mod_unique_downloads: u32,
    pub uid: u64,
    pub mod_id: u32,
    pub game_id: u32,
    pub allow_rating: bool,
    pub domain_name: String,
    pub category_id: u32,
    pub version: String,
    pub endorsement_count: u32,
    pub created_timestamp: u64,
    pub created_time: String,
    pub updated_timestamp: u64,
    pub updated_time: String,
    pub author: String,
    pub uploaded_by: String,
    pub uploaded_users_profile_url: String,
    pub contains_adult_content: bool,
    pub status: String,
    pub available: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn nexus_mod_details(
    nexus_api_key: String,
    request_options: ModDetailsRequestOptions,
) -> Result<ModDetails, String> {
    let base_url = "https://api.nexusmods.com";
    let mod_details_url = format!(
        "{}/v1/games/{}/mods/{}.json",
        base_url, request_options.game_domain_name, request_options.mod_id
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        "apikey",
        HeaderValue::from_str(&nexus_api_key).map_err(|e| e.to_string())?,
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&mod_details_url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Nexus Mods API: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Nexus API returned an error: {}", error_text));
    }

    let details: ModDetails = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(details)
}
