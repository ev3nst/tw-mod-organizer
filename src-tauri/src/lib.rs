use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;

mod create_app_default_paths;
mod delete_mod;
mod delete_save_file;
mod download_manager;
mod export_profile;
mod get_pack_conflicts;
mod get_pack_files;
mod get_save_files;
mod get_zip_contents;
mod highlight_path;
mod import_data;
mod install_mod;
mod is_game_running;
mod local_mods;
mod migrate_local_mod;
mod migrations;
mod nexus_auth_init;
mod nexus_download_link;
mod nxm_protocol_toggle;
mod open_external_url;
mod parse_profile_json;
mod protected_paths;
mod start_game;
mod steam_library_paths;
mod steam_paths;
mod steamworks;
mod subscribe;
mod subscribed_mods;
mod supported_games;
mod unsubscribe;

pub struct AppState {
    download_manager: Arc<Mutex<download_manager::DownloadManager>>,
    nexus_auth: nexus_auth_init::NexusAuthState,
    steam_state: steamworks::client::SteamState,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(arg) = args.get(1) {
                if arg.starts_with("nxm://") {
                    app.app_handle().emit("nxm-protocol", arg.clone()).unwrap();
                    let _ = app
                        .get_webview_window("main")
                        .expect("no main window")
                        .set_focus();
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:twmodorganizer.db", migrations::get_migrations())
                .build(),
        )
        .manage(AppState {
            download_manager: Arc::new(Mutex::new(download_manager::DownloadManager::new())),
            nexus_auth: nexus_auth_init::NexusAuthState {
                ws_connected: Arc::new(Mutex::new(false)),
            },
            steam_state: steamworks::client::SteamState::new(),
        })
        .invoke_handler(tauri::generate_handler![
            open_external_url::open_external_url,
            subscribed_mods::subscribed_mods,
            delete_mod::delete_mod,
            unsubscribe::unsubscribe,
            get_pack_files::get_pack_files,
            get_pack_conflicts::get_pack_conflicts,
            steam_paths::steam_paths,
            steam_library_paths::steam_library_paths,
            supported_games::supported_games,
            nexus_auth_init::nexus_auth_init,
            nxm_protocol_toggle::nxm_protocol_toggle,
            local_mods::local_mods,
            nexus_download_link::nexus_download_link,
            download_manager::start_download,
            download_manager::pause_download,
            download_manager::remove_download,
            download_manager::sync_downloads,
            highlight_path::highlight_path,
            get_save_files::get_save_files,
            delete_save_file::delete_save_file,
            get_zip_contents::get_zip_contents,
            import_data::import_data,
            install_mod::install_mod,
            start_game::start_game,
            is_game_running::is_game_running,
            export_profile::export_profile,
            parse_profile_json::parse_profile_json,
            subscribe::subscribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
