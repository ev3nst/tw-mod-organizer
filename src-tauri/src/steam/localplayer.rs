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
// Modified by Burak Kartal on [01/05/2025]

use serde::{Deserialize, Serialize};
use steamworks::SteamId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerSteamId {
    pub raw: SteamId,
    pub steam_id64: u64,
    pub steam_id32: String,
    pub account_id: u32,
}

impl PlayerSteamId {
    pub(crate) fn from_steamid(steam_id: SteamId) -> Self {
        Self {
            raw: steam_id,
            steam_id64: steam_id.raw(),
            steam_id32: steam_id.steamid32(),
            account_id: steam_id.account_id().raw(),
        }
    }
}
