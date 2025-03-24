use std::{
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc},
};
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;

mod download;
mod game;
mod r#mod;
mod nexus;
mod pack;
mod sevenz;
mod steam;
mod utils;
mod xml;

mod export_profile;
mod import_data;
mod parse_profile_json;
mod version_check;

mod migrations;

pub struct AppState {
    download_manager: Arc<Mutex<download::manager::DownloadManager>>,
    nexus_auth: nexus::auth_init::NexusAuthState,
    steam_state: steam::client::SteamState,
    save_watcher_running: Arc<AtomicBool>,
    save_folder_path: Arc<Mutex<PathBuf>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            download_manager: Arc::new(Mutex::new(download::manager::DownloadManager::new())),
            nexus_auth: nexus::auth_init::NexusAuthState {
                ws_connected: Arc::new(Mutex::new(false)),
            },
            steam_state: steam::client::SteamState::new(),
            save_watcher_running: Arc::new(AtomicBool::new(false)),
            save_folder_path: Arc::new(Mutex::new(PathBuf::from(""))),
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Destroyed { .. } => {
                let app_handle = window.app_handle();
                let state = app_handle.state::<AppState>();
                state.steam_state.drop_all_clients();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            import_data::import_data,
            export_profile::export_profile,
            parse_profile_json::parse_profile_json,
            version_check::version_check,
            r#mod::conflicts::conflicts,
            r#mod::base_mods::base_mods,
            r#mod::local_mods::local_mods,
            r#mod::install::install_mod,
            r#mod::delete::delete_mod,
            game::save_files::save_files,
            game::delete_save_file::delete_save_file,
            game::set_watch_save_folder::set_watch_save_folder,
            game::save_folder_watch::save_folder_watch,
            game::upsert_save_file_meta::upsert_save_file_meta,
            game::fetch_save_file_meta::fetch_save_file_meta,
            game::totalwar::start::start_game_totalwar,
            game::bannerlord::start::start_game_bannerlord,
            game::is_running::is_game_running,
            game::supported_games::supported_games,
            sevenz::zip_contents::zip_contents,
            nexus::auth_init::nexus_auth_init,
            nexus::download_link::nexus_download_link,
            nexus::mod_details::nexus_mod_details,
            nexus::nxm_protocol_toggle::nxm_protocol_toggle,
            download::start::start_download,
            download::pause::pause_download,
            download::remove::remove_download,
            download::sync::sync_downloads,
            steam::steam_paths::steam_paths,
            steam::steam_library_paths::steam_library_paths,
            steam::subscribe::subscribe,
            steam::subscribed_mods::subscribed_mods,
            steam::unsubscribe::unsubscribe,
            steam::update_workshop_item::update_workshop_item,
            utils::open_external_url::open_external_url,
            utils::highlight_path::highlight_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
