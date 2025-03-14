use std::sync::{Arc, Mutex};
use steamworks::{Client, SingleClient};

#[derive(Default)]
pub struct SteamState {
    client: Arc<Mutex<Option<(u32, Client)>>>,
    single_client: Mutex<Option<(u32, SingleClient)>>,
}

impl SteamState {
    pub fn new() -> Self {
        SteamState {
            client: Arc::new(Mutex::new(None)),
            single_client: Mutex::new(None),
        }
    }

    pub fn has_client(&self, app_id: u32) -> bool {
        if let Some((current_app_id, _)) = self.client.lock().unwrap().as_ref() {
            *current_app_id == app_id
        } else {
            false
        }
    }

    pub fn get_client(&self, app_id: u32) -> Option<Client> {
        let state = self.client.lock().unwrap();
        if let Some((current_app_id, ref client)) = *state {
            if current_app_id == app_id {
                return Some(client.clone());
            }
        }
        None
    }

    pub fn run_callbacks(&self, app_id: u32) -> Result<(), String> {
        let mut state = self.single_client.lock().unwrap();
        if let Some((current_app_id, ref mut single_client)) = *state {
            if current_app_id == app_id {
                single_client.run_callbacks();
                return Ok(());
            }
        }
        Err("Single client not found for given app_id".to_string())
    }

    pub fn set_clients(&self, app_id: u32, client: Client, single_client: SingleClient) {
        {
            let mut client_state = self.client.lock().unwrap();
            *client_state = Some((app_id, client));
        }
        {
            let mut single_client_state = self.single_client.lock().unwrap();
            *single_client_state = Some((app_id, single_client));
        }
    }

    pub fn drop_all_clients(&self) {
        {
            let mut client_state = self.client.lock().unwrap();
            *client_state = None;
        }
        {
            let mut single_client_state = self.single_client.lock().unwrap();
            *single_client_state = None;
        }
    }
}
