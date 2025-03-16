use tauri::AppHandle;
use tauri_plugin_deep_link::DeepLinkExt;

#[tauri::command(rename_all = "snake_case")]
pub fn nxm_protocol_toggle(handle: AppHandle, protocol_state: bool) -> Result<(), String> {
    if protocol_state == true {
        let _ = handle.deep_link().register("nxm").map_err(|e| e);
    } else {
        let _ = handle.deep_link().unregister("nxm").map_err(|e| e);
    }

    Ok(())
}
