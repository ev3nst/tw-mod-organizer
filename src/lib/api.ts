import { convertFileSrc, invoke } from '@tauri-apps/api/core';

import {
	SettingModel,
	type IGameMeta,
	type SteamLibraryPaths,
} from '@/lib/store/setting';
import type { ProfileExportData } from '@/lib/store/profile-model';
import type { ModItem } from '@/lib/store/mods';
import type { SaveFile, SaveFileLoadOrderData } from '@/lib/store/save_files';
import { normalizeTimestamp } from '@/lib/utils';

export type ModConflicts = {
	[mod_file_path: string]: Array<string[]>;
};

export type NexusDownloadLinkRequest = {
	game_domain_name: string;
	mod_id: number;
	file_id: number;
	download_key: string;
	download_expires: number;
};

export type NexusDownloadResponse = {
	download_url: string;
	file_size: number;
	preview_url: string;
	version: string;
	mod_url: string;
};

export type ZipItemInfo = {
	filename: string;
	filesize: number;
};

type ModMigrationResponse = {
	mod_meta_information: Record<
		string,
		{ identifier: string; name: string; categories: string }[]
	>;
	mod_profiles: Record<
		string,
		{
			profile_name: string;
			mods: {
				identifier: string;
				title: string;
				mod_file_path: string;
				is_active: boolean;
			}[];
		}[]
	>;
};

class API {
	async supported_games(): Promise<IGameMeta[]> {
		return invoke('supported_games');
	}

	async open_external_url(url: string): Promise<void> {
		return invoke('open_external_url', {
			url,
		});
	}

	async steam_library_paths(): Promise<SteamLibraryPaths> {
		return invoke('steam_library_paths');
	}

	async get_mods(app_id: number): Promise<ModItem[]> {
		const base_mods = await this.base_mods(app_id);
		const steam_mods = (await this.subscribed_mods(app_id)).map(sm => {
			return {
				...sm,
				preview_local:
					sm.preview_local !== null && sm.preview_local !== ''
						? convertFileSrc(sm.preview_local)
						: '',
			};
		});
		const local_mods = (await this.local_mods(app_id)).map(lm => {
			return {
				...lm,
				created_at: normalizeTimestamp(lm.created_at),
				updated_at: lm.updated_at
					? normalizeTimestamp(lm.updated_at)
					: normalizeTimestamp(lm.created_at),
				preview_local:
					lm.preview_local !== null && lm.preview_local !== ''
						? convertFileSrc(lm.preview_local)
						: '',
				item_type:
					lm?.url && lm.url.startsWith('https://www.nexusmods.com')
						? 'nexus_mod'
						: ('local_mod' as any),
			};
		});

		const modsMerged = [...base_mods, ...steam_mods, ...local_mods];
		const modMap = new Map();
		modsMerged.forEach(mod => {
			modMap.set(mod.identifier, mod);
		});

		for (const mod of modsMerged) {
			if (mod.child_mods && mod.child_mods.length > 0) {
				for (const childModId of mod.child_mods) {
					const childMod = modMap.get(childModId);
					if (childMod) {
						childMod.required_items.push(mod.identifier);
					}
				}
			}
		}

		return modsMerged;
	}

	private async base_mods(app_id: number): Promise<ModItem[]> {
		return invoke('base_mods', {
			app_id,
		});
	}

	private async subscribed_mods(app_id: number): Promise<ModItem[]> {
		return invoke('subscribed_mods', {
			app_id,
		});
	}

	private async local_mods(app_id: number): Promise<ModItem[]> {
		const setting = await SettingModel.retrieve();
		return invoke('local_mods', {
			app_id,
			mod_installation_path: setting.mod_installation_path,
		});
	}

	async subscribe(app_id: number, item_id: number): Promise<boolean> {
		return invoke('subscribe', {
			app_id,
			item_id,
		});
	}

	async unsubscribe(app_id: number, item_id: number): Promise<boolean> {
		return invoke('unsubscribe', {
			app_id,
			item_id,
		});
	}

	async update_workshop_item(app_id: number, item_id: number): Promise<void> {
		return invoke('update_workshop_item', {
			app_id,
			item_id,
		});
	}

	async delete_mod(
		app_id: number,
		item_id: number | string,
	): Promise<boolean> {
		const setting = await SettingModel.retrieve();
		return invoke('delete_mod', {
			app_id,
			item_id,
			mod_installation_path: setting.mod_installation_path,
		});
	}

	async conflicts(
		app_id: number,
		folder_paths: string[],
	): Promise<ModConflicts> {
		return invoke('conflicts', {
			app_id,
			folder_paths,
		});
	}

	async nexus_auth_init(): Promise<void> {
		return invoke('nexus_auth_init');
	}

	async nxm_protocol_toggle(protocol_state: boolean): Promise<void> {
		return invoke('nxm_protocol_toggle', {
			protocol_state,
		});
	}

	async nexus_download_link(
		request_options: NexusDownloadLinkRequest,
	): Promise<NexusDownloadResponse> {
		const setting = await SettingModel.retrieve();
		if (
			!setting.nexus_api_key ||
			setting.nexus_api_key === null ||
			setting.nexus_api_key === ''
		) {
			throw new Error(
				'Nexus API KEY is not set, please initialize authentication process.',
			);
		}

		return invoke('nexus_download_link', {
			nexus_api_key: setting.nexus_api_key,
			request_options,
		});
	}

	async highlight_path(file_path: string): Promise<string[]> {
		return invoke('highlight_path', {
			file_path,
		});
	}

	async save_files(app_id: number): Promise<SaveFile[]> {
		return invoke('save_files', {
			app_id,
		});
	}

	async delete_save_file(app_id: number, filename: string): Promise<void> {
		return invoke('delete_save_file', {
			app_id,
			filename,
		});
	}

	async save_folder_watch(app_id: number): Promise<void> {
		await invoke('set_watch_save_folder', { app_id });
		return invoke('save_folder_watch', { app_id });
	}

	async upsert_save_file_meta(
		app_id: number,
		save_file_name: string,
		save_file_size: number,
		mod_order_data: SaveFileLoadOrderData[],
	): Promise<void> {
		return invoke('upsert_save_file_meta', {
			app_id,
			save_file_name,
			save_file_size,
			mod_order_data,
		});
	}

	async fetch_save_file_meta(
		app_id: number,
		save_file_name: string,
	): Promise<{
		save_file_name: string;
		save_file_size: number;
		mod_order_data: SaveFileLoadOrderData[];
		created_at: number;
	}> {
		return invoke('fetch_save_file_meta', {
			app_id,
			save_file_name,
		});
	}

	async zip_contents(zip_file_path: string): Promise<ZipItemInfo[]> {
		return invoke('zip_contents', {
			zip_file_path,
		});
	}

	async nexus_mod_details(request_options: {
		game_domain_name: string;
		mod_id: number;
	}): Promise<any> {
		return invoke('nexus_mod_details', {
			request_options,
		});
	}

	async install_mod(
		app_id: number,
		mod_details: {
			identifier: string;
			title: string;
			zip_file_path: string;
			mod_file_path: string;
			preview_url?: string;
			image_file_path?: string;
			description?: string;
			categories?: string;
			url?: string;
			download_url?: string;
			version?: string;
		},
		mod_installation_path: string,
	): Promise<void> {
		return invoke('install_mod', {
			app_id,
			mod_details,
			mod_installation_path,
		});
	}

	async import_data(
		app_id: number,
		json_file_path: string,
	): Promise<ModMigrationResponse> {
		const setting = await SettingModel.retrieve();
		return invoke('import_data', {
			app_id,
			json_file_path,
			mod_installation_path: setting.mod_installation_path,
		});
	}

	async start_game_totalwar(
		app_id: number,
		add_directory_txt: string,
		used_mods_txt: string,
		save_game?: string,
	): Promise<string> {
		return invoke('start_game_totalwar', {
			app_id,
			add_directory_txt,
			used_mods_txt,
			save_game,
		});
	}

	async start_game_bannerlord(
		app_id: number,
		mods: {
			identifier: string;
			bannerlord_id: string;
			mod_path: string;
		}[],
	): Promise<string> {
		return invoke('start_game_bannerlord', {
			app_id,
			mods,
		});
	}

	async export_profile(
		app_id: number,
		profile_id: number,
		profile_name: string,
		json_string: string,
	): Promise<string> {
		return invoke('export_profile', {
			app_id,
			profile_id,
			profile_name,
			json_string,
		});
	}

	async parse_profile_json(json_path: string): Promise<ProfileExportData> {
		return invoke('parse_profile_json', {
			json_path,
		});
	}

	async version_check(): Promise<{
		timestamp: number;
		version: string;
	}> {
		return invoke('version_check');
	}
}

const api = new API();

export default api;
