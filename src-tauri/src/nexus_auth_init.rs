use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, SqlitePool};
use std::error::Error;
use std::sync::Arc;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::open_external_url::open_external_url;
use crate::AppState;

// Define schemas and types
#[derive(Debug, Serialize, Deserialize)]
struct NexusAuthParams {
    id: String,
    token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NexusAuthRequest {
    id: String,
    token: Option<String>,
    protocol: u8,
}

#[derive(Debug, Serialize, Deserialize)]
struct NexusResponse {
    data: Option<NexusResponseData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NexusResponseData {
    connection_token: Option<String>,
    api_key: Option<String>,
}

struct SettingsDatabase {
    pool: SqlitePool,
}

impl SettingsDatabase {
    async fn new(app_handle: AppHandle) -> Result<Self, Box<dyn Error>> {
        let sqlite_db_path = app_handle
            .path()
            .resolve("twmodorganizer.db".to_string(), BaseDirectory::AppConfig)
            .map_err(|e| format!("Failed to resolve App Config directory: {}", e))?
            .into_os_string()
            .into_string()
            .map_err(|_| "Invalid path".to_string())?;

        let pool = SqlitePool::connect(&format!("sqlite://{}", sqlite_db_path)).await?;
        Ok(Self { pool })
    }

    async fn get_nexus_api_key(&self) -> Option<String> {
        let result: Option<(String,)> = query_as("SELECT nexus_api_key FROM settings WHERE id = 1")
            .fetch_optional(&self.pool)
            .await
            .ok()?;

        result.map(|(key,)| key)
    }

    async fn get_nexus_auth_params(&self) -> Option<NexusAuthParams> {
        let result: Option<(String,)> =
            query_as("SELECT nexus_auth_params FROM settings WHERE id = 1")
                .fetch_optional(&self.pool)
                .await
                .ok()?;

        result.and_then(|(params,)| serde_json::from_str(&params).ok())
    }

    async fn set_nexus_api_key(&self, value: &str) -> Result<(), Box<dyn Error>> {
        query("UPDATE settings SET nexus_api_key = ? WHERE id = 1")
            .bind(value)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn set_nexus_auth_params(&self, params: &NexusAuthParams) -> Result<(), Box<dyn Error>> {
        let json = serde_json::to_string(params)?;
        query("UPDATE settings SET nexus_auth_params = ? WHERE id = 1")
            .bind(json)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn ensure_settings_record(&self) -> Result<(), Box<dyn Error>> {
        query("INSERT OR IGNORE INTO settings (id) VALUES (1)")
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

pub struct NexusAuthState {
    pub ws_connected: Arc<Mutex<bool>>,
}

#[tauri::command]
pub async fn nexus_auth_init(
    app_handle: AppHandle,
    app_state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let ws_connected = app_state.nexus_auth.ws_connected.clone();
    let db = SettingsDatabase::new(app_handle.clone())
        .await
        .map_err(|e| e.to_string())?;

    if let Err(e) = db.ensure_settings_record().await {
        return Err(format!("Failed to initialize settings: {}", e));
    }

    tokio::spawn(async move {
        let nexus_api_key = db.get_nexus_api_key().await;
        if nexus_api_key.is_none() || nexus_api_key.unwrap().is_empty() {
            match tokio_tungstenite::connect_async("wss://sso.nexusmods.com").await {
                Ok((ws_stream, _)) => {
                    let (mut write, mut read) = ws_stream.split();
                    *ws_connected.lock().await = true;

                    let request_id = Uuid::new_v4().to_string();
                    let request = NexusAuthRequest {
                        id: request_id.clone(),
                        token: None,
                        protocol: 2,
                    };

                    let auth_params = NexusAuthParams {
                        id: request_id.clone(),
                        token: None,
                    };

                    let _ = db.set_nexus_auth_params(&auth_params).await;

                    if let Ok(request_json) = serde_json::to_string(&request) {
                        use tokio_tungstenite::tungstenite::Message;
                        let _ = write.send(Message::Text(request_json.into())).await;

                        while let Some(msg_result) = read.next().await {
                            if let Ok(msg) = msg_result {
                                if let Message::Text(text) = msg {
                                    if let Ok(response) =
                                        serde_json::from_str::<NexusResponse>(&text)
                                    {
                                        if let Some(data) = &response.data {
                                            if let Some(connection_token) = &data.connection_token {
                                                if let Some(mut auth_params) =
                                                    db.get_nexus_auth_params().await
                                                {
                                                    auth_params.token =
                                                        Some(connection_token.clone());
                                                    let _ = db
                                                        .set_nexus_auth_params(&auth_params)
                                                        .await;
                                                }

                                                let auth_url = format!("https://www.nexusmods.com/sso?id={}&application=tww", request_id);
                                                let _ = open_external_url(auth_url);
                                            }

                                            if let Some(api_key) = &data.api_key {
                                                let _ = db.set_nexus_api_key(api_key).await;
                                                let _ = app_handle
                                                    .emit("nexus-connection", "connected")
                                                    .unwrap_or_default();
                                                break;
                                            }
                                        }
                                    }
                                }
                            } else {
                                let _ = app_handle.dialog().message("App could not establish connection with nexus mods or received unexpected response.");
                                break;
                            }
                        }
                    }

                    let _ = write.close().await;
                    *ws_connected.lock().await = false;
                }
                Err(_) => {
                    let _ = app_handle.dialog().message("App could not establish connection with nexus mods or received unexpected response.");
                }
            }
        }
    });

    Ok(())
}
