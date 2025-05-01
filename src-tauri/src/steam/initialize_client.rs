use crate::AppState;
use steamworks::Client;

pub async fn initialize_client(
    app_state: &AppState,
    app_id: u32,
) -> Result<steamworks::Client, String> {
    let steam_state = &app_state.steam_state;

    if !steam_state.has_client(app_id) {
        steam_state.drop_all_clients();
        let (steam_client, single_client) = Client::init_app(app_id)
            .map_err(|err| format!("Failed to initialize Steam client: {}", err))?;
        steam_state.set_clients(app_id, steam_client, single_client);
    }

    steam_state
        .get_client(app_id)
        .ok_or_else(|| "Failed to get Steam client".to_string())
}
