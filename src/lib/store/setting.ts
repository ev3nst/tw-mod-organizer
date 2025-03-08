import { create } from 'zustand';

import { appConfigDir } from '@tauri-apps/api/path';

import { dbWrapper } from '@/lib/db';
import type { IGameMeta, SteamLibraryPaths } from '@/lib/api';
import { debounceCallback } from '@/lib/utils';

export type ModListColumnVisibility = {
	category: boolean;
	conflict: boolean;
	version: boolean;
};

export type NexusAuthParams = {
	id: string | null;
	token: string | null;
};

export type Setting = {
	id: number;
	selected_game: number | null;
	column_selections: ModListColumnVisibility;
	mod_installation_path: string | null;
	mod_download_path: string | null;
	nexus_auth_params: NexusAuthParams;
	nexus_api_key: string | null;
};

export class SettingModel {
	private constructor(public props: Setting) {}

	private jsonGetter(prop: any) {
		if (typeof prop !== 'string') return prop;

		try {
			return JSON.parse(prop);
		} catch (_e) {
			return prop;
		}
	}

	public static async retrieve(): Promise<SettingModel> {
		const result: any = await dbWrapper.db.select(
			`SELECT * FROM settings WHERE id = ?`,
			[1],
		);

		if (result && result[0]) {
			return new SettingModel(result[0]);
		} else {
			const appConfigPath = await appConfigDir();
			const column_selections = {
				category: true,
				conflict: true,
				version: true,
			};
			const mod_installation_path = `${appConfigPath}\\mods`;
			const mod_download_path = `${appConfigPath}\\downloads`;
			const result = await dbWrapper.db.execute(
				`INSERT INTO settings (column_selections, mod_installation_path, mod_download_path) VALUES (?, ?, ?)`,
				[column_selections, mod_installation_path, mod_download_path],
			);

			if (result.lastInsertId) {
				return new SettingModel({
					id: result.lastInsertId,
					selected_game: null,
					column_selections: {
						category: true,
						conflict: true,
						version: true,
					},
					mod_installation_path: null,
					mod_download_path: null,
					nexus_auth_params: {
						id: null,
						token: null,
					},
					nexus_api_key: null,
				});
			} else {
				throw new Error('Error while initiating the settings record');
			}
		}
	}

	public async save(): Promise<boolean> {
		if (!this.props.id || this.props.id !== 1) {
			throw new Error('Setting record must have an id and should be 1');
		}

		const columns = Object.keys(this.props)
			.map(key => `${key} = ?`)
			.join(', ');

		const values = Object.keys(this.props).map(key => {
			const value = (this.props as any)[key];
			if (
				[
					'column_selections',
					'mod_order',
					'nexus_auth_params',
				].includes(key)
			) {
				return value !== null && typeof value !== 'string'
					? JSON.stringify(value)
					: value;
			}

			return value;
		});

		const result = await dbWrapper.db.execute(
			`UPDATE settings SET ${columns} WHERE id = ?`,
			[...values, this.props.id],
		);

		if (result.rowsAffected > 0) {
			return true;
		} else {
			console.error(result);
			throw new Error('Failed to save settings.');
		}
	}

	// Selected Game
	get selected_game(): number | null {
		return this.props.selected_game;
	}

	set selected_game(value: number | null) {
		this.props.selected_game = value;
	}

	// Column Selections
	get column_selections(): ModListColumnVisibility {
		return this.jsonGetter(this.props.column_selections);
	}

	set column_selections(value: ModListColumnVisibility) {
		this.props.column_selections = value;
	}

	// Mod Installation Path
	get mod_installation_path(): string | null {
		return this.props.mod_installation_path;
	}

	set mod_installation_path(value: string) {
		this.props.mod_installation_path = value;
	}

	// Mod Downoad Path
	get mod_download_path(): string | null {
		return this.props.mod_download_path;
	}

	set mod_download_path(value: string) {
		this.props.mod_download_path = value;
	}

	// Nexus Auth Params
	get nexus_auth_params(): NexusAuthParams {
		return this.jsonGetter(this.props.nexus_auth_params);
	}

	set nexus_auth_params(value: NexusAuthParams) {
		this.props.nexus_auth_params = value;
	}

	// Nexus API Key
	get nexus_api_key(): string | null {
		return this.props.nexus_api_key;
	}

	set nexus_api_key(value: string | null) {
		this.props.nexus_api_key = value;
	}
}

type SettingStore = {
	loading: boolean;
	steam_library_paths: SteamLibraryPaths;
	mod_download_path: string;
	mod_installation_path: string;
	selectedGame?: IGameMeta;
	games: IGameMeta[];
	nexus_api_key: string | null;
	nexus_auth_params: NexusAuthParams;
	toggle_category: boolean;
	toggle_conflict: boolean;
	toggle_version: boolean;
	isGameRunning: boolean;
	setIsGameRunning: (isGameRunning: boolean) => void;
	setLoading: (loading: boolean) => void;
	setSteamLibraryPaths: (steam_library_paths: SteamLibraryPaths) => void;
	setModDownloadPath: (mod_download_path: string) => void;
	setModInstallationPath: (mod_installation_path: string) => void;
	setSelectedGame: (selectedGame?: IGameMeta) => void;
	setGames: (
		games: IGameMeta[],
		steam_library_paths: SteamLibraryPaths,
	) => void;
	setNexusAuthApi: (nexus_api_key: string | null) => void;
	setNexusAuthParams: (nexus_auth_params: NexusAuthParams) => void;
	setCategory: (toggle_category: boolean) => void;
	setConflict: (toggle_conflict: boolean) => void;
	setVersion: (toggle_version: boolean) => void;
};

export const settingStore = create<SettingStore>(set => ({
	loading: false,
	steam_library_paths: {
		library_folder_paths: [],
		game_install_paths: {},
		game_workshop_paths: {},
	},
	mod_download_path: '',
	mod_installation_path: '',
	selectedGame: undefined,
	games: [],
	nexus_api_key: '',
	nexus_auth_params: {
		id: null,
		token: null,
	},
	toggle_category: true,
	toggle_conflict: true,
	toggle_version: true,
	isGameRunning: false,
	setIsGameRunning: isGameRunning => {
		set({ isGameRunning });
	},
	setLoading: loading => {
		set({ loading });
	},
	setSteamLibraryPaths: steam_library_paths => {
		set({ steam_library_paths });
	},
	setModDownloadPath: mod_download_path => {
		set({ mod_download_path });
		debounceCallback(syncSetting);
	},
	setModInstallationPath: mod_installation_path => {
		set({ mod_installation_path });
		debounceCallback(syncSetting);
	},
	setSelectedGame: selectedGame => {
		set({ selectedGame });
		debounceCallback(syncSetting);
	},
	setGames: (games, steam_library_paths) => {
		games = games.map(game => {
			const gamePathExists =
				typeof steam_library_paths.game_install_paths !== 'undefined' &&
				typeof steam_library_paths.game_install_paths[game.slug] !==
					'undefined' &&
				steam_library_paths.game_install_paths[game.slug].length > 0;
			return {
				...game,
				game_path_exists: gamePathExists,
			};
		});

		set({ games });
	},
	setNexusAuthApi: nexus_api_key => {
		set({ nexus_api_key });
		debounceCallback(syncSetting);
	},
	setNexusAuthParams: nexus_auth_params => {
		set({ nexus_auth_params });
		debounceCallback(syncSetting);
	},
	setCategory: toggle_category => {
		set({ toggle_category });
		debounceCallback(syncSetting);
	},
	setConflict: toggle_conflict => {
		set({ toggle_conflict });
		debounceCallback(syncSetting);
	},
	setVersion: toggle_version => {
		set({ toggle_version });
		debounceCallback(syncSetting);
	},
}));

const syncSetting = async () => {
	const {
		selectedGame,
		mod_installation_path,
		mod_download_path,
		nexus_api_key,
		nexus_auth_params,
		toggle_category,
		toggle_conflict,
		toggle_version,
	} = settingStore.getState();
	const setting = await SettingModel.retrieve();

	let changed = false;
	if (setting.selected_game != selectedGame?.steam_id) {
		setting.selected_game = selectedGame?.steam_id ?? null;
		changed = true;
	}

	if (
		typeof mod_download_path !== 'undefined' &&
		mod_download_path !== null
	) {
		setting.mod_download_path = mod_download_path;
		changed = true;
	}

	if (
		typeof mod_installation_path !== 'undefined' &&
		mod_installation_path !== null
	) {
		setting.mod_installation_path = mod_installation_path;
		changed = true;
	}

	if (setting.nexus_api_key !== nexus_api_key) {
		setting.nexus_api_key = nexus_api_key;
		changed = true;
	}

	if (
		(setting.nexus_auth_params === null && nexus_auth_params !== null) ||
		(setting.nexus_auth_params !== null && nexus_auth_params === null) ||
		(setting.nexus_auth_params.id !== nexus_auth_params.id &&
			setting.nexus_auth_params.token !== nexus_auth_params.token)
	) {
		setting.nexus_auth_params = nexus_auth_params ?? {
			id: null,
			token: null,
		};
		changed = true;
	}

	if (
		setting.column_selections.category !== toggle_category ||
		setting.column_selections.conflict !== toggle_conflict ||
		setting.column_selections.version !== toggle_version
	) {
		setting.column_selections = {
			category: toggle_category,
			conflict: toggle_conflict,
			version: toggle_version,
		};
		changed = true;
	}

	if (changed) {
		await setting.save();
	}
};
