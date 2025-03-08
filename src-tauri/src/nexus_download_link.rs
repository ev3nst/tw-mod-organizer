use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};

#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
struct DownloadLink {
    URI: String,
}

#[derive(Serialize, Deserialize)]
pub struct RequestOptions {
    pub game_domain_name: String,
    pub mod_id: u32,
    pub file_id: u32,
    pub download_key: Option<String>,
    pub download_expires: Option<u64>,
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub status: String,
    pub message: String,
    pub output: Option<String>,
}

#[derive(Serialize)]
pub struct DownloadResponse {
    pub download_url: String,
    pub file_size: Option<u64>,
    pub preview_url: String,
    pub version: String,
    pub mod_url: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn nexus_download_link(
    nexus_api_key: String,
    request_options: RequestOptions,
) -> Result<DownloadResponse, ApiResponse> {
    let base_url = "https://api.nexusmods.com";
    let endpoint = format!(
        "/v1/games/{}/mods/{}/files/{}/download_link.json",
        request_options.game_domain_name, request_options.mod_id, request_options.file_id
    );

    let url = format!("{}{}", base_url, endpoint);
    let mut headers = HeaderMap::new();
    headers.insert("apiKey", HeaderValue::from_str(&nexus_api_key).unwrap());

    let client = reqwest::Client::builder().build().unwrap();
    let mut request_builder = client.get(&url).headers(headers.clone());

    if let Some(key) = &request_options.download_key {
        request_builder = request_builder.query(&[("key", key)]);
    }

    if let Some(expires) = &request_options.download_expires {
        request_builder = request_builder.query(&[("expires", expires.to_string())]);
    }

    let response = request_builder.send().await.map_err(|e| ApiResponse {
        status: "failed".to_string(),
        message: format!("Failed to connect to Nexus Mods API: {}", e),
        output: None,
    })?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(ApiResponse {
            status: "failed".to_string(),
            message: "Nexus API returned an error".to_string(),
            output: Some(error_text),
        });
    }

    let download_links = response
        .json::<Vec<DownloadLink>>()
        .await
        .map_err(|e| ApiResponse {
            status: "failed".to_string(),
            message: format!("Failed to parse response: {}", e),
            output: None,
        })?;

    if let Some(first_link) = download_links.get(0) {
        let head_response = client
            .head(&first_link.URI)
            .send()
            .await
            .map_err(|e| ApiResponse {
                status: "failed".to_string(),
                message: format!("Failed to fetch file size: {}", e),
                output: None,
            })?;

        let file_size = head_response
            .headers()
            .get("content-length")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());

        let mod_details = get_nexus_mod_details(&nexus_api_key, &request_options)
            .await
            .map_err(|e| ApiResponse {
                status: "failed".to_string(),
                message: e,
                output: None,
            })?;

        Ok(DownloadResponse {
            download_url: first_link.URI.clone(),
            file_size,
            preview_url: mod_details.picture_url,
            version: mod_details.version,
            mod_url: format!(
                "https://www.nexusmods.com/{}/mods/{}",
                request_options.game_domain_name, request_options.mod_id
            ),
        })
    } else {
        Err(ApiResponse {
            status: "failed".to_string(),
            message: "No download links found in response".to_string(),
            output: Some("[]".to_string()),
        })
    }
}

#[derive(Deserialize, Debug)]
pub struct ModDetails {
    pub picture_url: String,
    pub version: String,
}

pub async fn get_nexus_mod_details(
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
