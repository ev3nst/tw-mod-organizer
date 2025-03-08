// MIT License
//
// Copyright (c) 2022 Gabriel Francisco Dos Santos
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// Modified by Burak Kartal on [01/03/2025]

use std::sync::Mutex;
use steamworks::Client;

lazy_static! {
    static ref STEAM_STATE: Mutex<Option<(u32, Client)>> = Mutex::new(None);
}

pub fn has_client(app_id: u32) -> bool {
    if let Some((current_app_id, _)) = STEAM_STATE.lock().unwrap().as_ref() {
        *current_app_id == app_id
    } else {
        false
    }
}

pub fn get_client(app_id: u32) -> Option<Client> {
    let state = STEAM_STATE.lock().unwrap();
    if let Some((current_app_id, ref client)) = *state {
        if current_app_id == app_id {
            return Some(client.clone());
        }
    }
    None
}

pub fn set_client(app_id: u32, client: Client) {
    let mut state = STEAM_STATE.lock().unwrap();
    *state = Some((app_id, client));
}

pub fn drop_all_clients() {
    let mut state = STEAM_STATE.lock().unwrap();
    *state = None;
}
