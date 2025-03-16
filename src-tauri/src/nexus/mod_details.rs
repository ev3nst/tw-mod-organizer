use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct RequestOptions {
    pub game_domain_name: String,
    pub mod_id: u32,
    pub file_id: u32,
    pub download_key: Option<String>,
    pub download_expires: Option<u64>,
}

#[derive(Deserialize, Debug)]
pub struct ModDetails {
    pub picture_url: String,
    pub version: String,
}

pub async fn mod_details(
    nexus_api_key: &str,
    request_options: &RequestOptions,
) -> Result<ModDetails, String> {
    let base_url = "https://api.nexusmods.com";
    let mod_details_url = format!(
        "{}/v1/games/{}/mods/{}.json",
        base_url, request_options.game_domain_name, request_options.mod_id
    );

    let mut headers = HeaderMap::new();
    headers.insert(
        "apikey",
        HeaderValue::from_str(nexus_api_key).map_err(|e| e.to_string())?,
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
