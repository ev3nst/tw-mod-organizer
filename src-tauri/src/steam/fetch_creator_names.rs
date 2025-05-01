use crate::AppState;
use futures_util::FutureExt;
use rustc_hash::{FxHashMap, FxHashSet};
use steamworks::SteamId;

pub async fn fetch_creator_names(
    steam_client: steamworks::Client,
    creator_ids: Vec<SteamId>,
    app_state: tauri::State<'_, AppState>,
    app_id: u32,
) -> Result<FxHashMap<SteamId, String>, String> {
    if creator_ids.is_empty() {
        return Ok(FxHashMap::default());
    }

    let (creator_tx, mut creator_rx) = tokio::sync::mpsc::channel(32);

    let creator_task = tokio::task::spawn_blocking(move || {
        let friends = steam_client.friends();
        let mut unknown_creators = FxHashSet::default();

        let unique_creator_ids: FxHashSet<_> = creator_ids.into_iter().collect();

        for &creator_id in &unique_creator_ids {
            let creator = friends.get_friend(creator_id);
            if creator.name() == "[unknown]" {
                unknown_creators.insert(creator_id);
                let _ = friends.request_user_information(creator_id, true);
            }
        }

        if !unknown_creators.is_empty() {
            let start_time = std::time::Instant::now();
            let timeout = std::time::Duration::from_secs(2);

            while !unknown_creators.is_empty() && start_time.elapsed() < timeout {
                let _ = creator_tx.blocking_send(());
                std::thread::sleep(std::time::Duration::from_millis(50));
                unknown_creators.retain(|&id| {
                    let creator = friends.get_friend(id);
                    creator.name() == "[unknown]"
                });
            }
        }

        let mut names = FxHashMap::default();
        for &id in &unique_creator_ids {
            let creator = friends.get_friend(id);
            names.insert(id, creator.name());
        }

        names
    });

    let mut creator_result = None;
    let mut fused_creator_task = creator_task.fuse();

    while creator_result.is_none() {
        tokio::select! {
            Some(_) = creator_rx.recv() => {
                app_state.steam_state.run_callbacks(app_id)?;
            }
            task_result = &mut fused_creator_task => {
                creator_result = Some(
                    task_result.map_err(|e| format!("Creator task error: {}", e))?
                );
                break;
            }
        }
    }

    Ok(creator_result.unwrap())
}
