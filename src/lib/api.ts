import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { SettingModel } from './store/setting';

export type IGameMeta = {
	name: string;
	slug: string;
	save_path_folder: string;
	exe_name: string;
	steam_id: number;
	steam_folder_name: string;
	nexus_slug: string;
	schema_name: string;
	game_path_exists: boolean;
};

export type ModItem = {
	identifier: string;
	title: string;
	description: string;
	created_at: number;
	categories: string;
	version: string | number;
	item_type: string; // steam_mod, local_mod
	url?: string;
	preview_url?: string | null;
	pack_file: string;
	pack_file_path: string;
	preview_local: string;
	// separator type workaround to supress error
	background_color?: string;
	text_color?: string;
};

export type ModSeparatorItem = {
	identifier: string;
	title: string;
	order: number;
	background_color: string;
	text_color: string;
	collapsed: boolean;
};

export type ModItemSeparatorUnion = ModSeparatorItem | ModItem;

export type PackConflicts = {
	[pack_file_path: string]: Array<string[]>;
};

export type SteamLibraryPaths = {
	library_folder_paths: string[];
	game_install_paths: { [app_id: string]: string };
	game_workshop_paths: { [app_id: string]: string };
};

export type NexusDownloadLinkRequest = {
	game_domain_name: string;
	mod_id: number;
	file_id: number;
	download_key: string;
	download_expires: number;
};

export type SaveFile = {
	filename: string;
	filesize: number;
	date: number;
	path: string;
};

export type ZipItemInfo = {
	filename: string;
	filesize: number;
};

export type NexusDownloadResponse = {
	download_url: string;
	file_size: number;
	preview_url: string;
	version: string;
	mod_url: string;
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
				preview_local:
					lm.preview_local !== null && lm.preview_local !== ''
						? convertFileSrc(lm.preview_local)
						: '',
			};
		});
		return [...steam_mods, ...local_mods];
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

	async unsubscribe(app_id: number, item_id: number): Promise<boolean> {
		return invoke('unsubscribe', {
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

	async get_pack_files(pack_file_path: string): Promise<string[]> {
		return invoke('get_pack_files', {
			pack_file_path,
		});
	}

	async get_pack_conflicts(folder_paths: string[]): Promise<PackConflicts> {
		return invoke('get_pack_conflicts', {
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

	async get_save_files(app_id: number): Promise<SaveFile[]> {
		return invoke('get_save_files', {
			app_id,
		});
	}

	async delete_save_file(app_id: number, filename: string): Promise<void> {
		return invoke('delete_save_file', {
			app_id,
			filename,
		});
	}

	async get_zip_contents(zip_file_path: string): Promise<ZipItemInfo[]> {
		return invoke('get_zip_contents', {
			zip_file_path,
		});
	}

	async install_mod(
		app_id: number,
		mod_details: {
			identifier: string;
			title: string;
			zip_file_path: string;
			pack_file_path: string;
			downloaded_url?: string;
			description?: string;
			categories?: string;
			url?: string;
			preview_url?: string;
			version?: string;
		},
		mod_installation_path: string,
	): Promise<ZipItemInfo[]> {
		return invoke('install_mod', {
			app_id,
			mod_details,
			mod_installation_path,
		});
	}

	async start_game(
		app_id: number,
		add_directory_txt: string,
		used_mods_txt: string,
		save_game?: string,
	): Promise<ZipItemInfo[]> {
		return invoke('start_game', {
			app_id,
			add_directory_txt,
			used_mods_txt,
			save_game,
		});
	}
}

const api = new API();

export default api;
