use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionResponse {
    version: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn version_check() -> Result<VersionResponse, String> {
    let url = "https://github.com/ev3nst/tw-mod-organizer/releases/latest/download/latest.json";

    let client = Client::new();
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|err| format!("Request failed: {}", err))?;

    if res.status().is_success() {
        let version_info: VersionResponse = res
            .json()
            .await
            .map_err(|err| format!("Failed to deserialize response: {}", err))?;
        Ok(version_info)
    } else {
        Err(format!(
            "Failed to fetch the version info. Status: {}",
            res.status()
        ))
    }
}
