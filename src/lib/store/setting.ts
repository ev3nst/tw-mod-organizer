import { create } from 'zustand';

import { appConfigDir } from '@tauri-apps/api/path';

import { dbWrapper } from '@/lib/db';
import type { IGameMeta, SteamLibraryPaths } from '@/lib/api';
import { debounceCallback } from '@/lib/utils';

export type ModListColumnVisibility = {
	category: boolean;
	conflict: boolean;
	version: boolean;
	creator: boolean;
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
	dependency_confirmation: 1 | 0;
	sort_by: 'load_order' | 'title' | 'version';
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
				`INSERT INTO settings (column_selections, mod_installation_path, mod_download_path, dependency_confirmation) VALUES (?, ?, ?, ?)`,
				[
					column_selections,
					mod_installation_path,
					mod_download_path,
					1,
				],
			);

			if (result.lastInsertId) {
				return new SettingModel({
					id: result.lastInsertId,
					selected_game: null,
					column_selections: {
						category: true,
						conflict: true,
						version: true,
						creator: false,
					},
					mod_installation_path: null,
					mod_download_path: null,
					nexus_auth_params: {
						id: null,
						token: null,
					},
					nexus_api_key: null,
					dependency_confirmation: 1,
					sort_by: 'load_order',
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

	// Dependency Confirmation
	get dependency_confirmation(): 1 | 0 {
		return this.props.dependency_confirmation;
	}

	set dependency_confirmation(value: 1 | 0) {
		this.props.dependency_confirmation = value;
	}

	// Sort By
	get sort_by(): 'load_order' | 'title' | 'version' {
		return this.props.sort_by;
	}

	set sort_by(value: 'load_order' | 'title' | 'version') {
		this.props.sort_by = value;
	}
}

type SettingStore = {
	loading: boolean;
	setLoading: (loading: boolean) => void;

	steam_library_paths: SteamLibraryPaths;
	setSteamLibraryPaths: (steam_library_paths: SteamLibraryPaths) => void;

	mod_download_path: string;
	setModDownloadPath: (mod_download_path: string) => void;

	mod_installation_path: string;
	setModInstallationPath: (mod_installation_path: string) => void;

	selectedGame?: IGameMeta;
	setSelectedGame: (selectedGame?: IGameMeta) => void;

	games: IGameMeta[];
	setGames: (
		games: IGameMeta[],
		steam_library_paths: SteamLibraryPaths,
	) => void;

	nexus_api_key: string | null;
	setNexusAuthApi: (nexus_api_key: string | null) => void;

	nexus_auth_params: NexusAuthParams;
	setNexusAuthParams: (nexus_auth_params: NexusAuthParams) => void;

	toggle_category: boolean;
	toggle_conflict: boolean;
	toggle_version: boolean;
	toggle_creator: boolean;
	setColumnSelection: (
		column: 'category' | 'conflict' | 'version' | 'creator',
		value: boolean,
	) => void;

	dependency_confirmation: 1 | 0;
	setDependencyConfirmation: (dependency_confirmation: 1 | 0) => void;

	sort_by: 'load_order' | 'title' | 'version';
	setSortBy: (sort_by: 'load_order' | 'title' | 'version') => void;

	isGameLoading: boolean;
	setIsGameLoading: (isGameLoading: boolean) => void;

	isGameRunning: boolean;
	setIsGameRunning: (isGameRunning: boolean) => void;

	shouldLockScreen: boolean;
	setLockScreen: (shouldLockScreen: boolean) => void;

	init_reload: boolean;
	setInitReload: (init_reload: boolean) => void;
};

export const settingStore = create<SettingStore>(set => ({
	loading: false,
	setLoading: loading => {
		set({ loading });
	},

	steam_library_paths: {
		library_folder_paths: [],
		game_install_paths: {},
		game_workshop_paths: {},
	},
	setSteamLibraryPaths: steam_library_paths => {
		set({ steam_library_paths });
	},

	mod_download_path: '',
	setModDownloadPath: mod_download_path => {
		set({ mod_download_path });
		debounceCallback(syncSetting);
	},

	mod_installation_path: '',
	setModInstallationPath: mod_installation_path => {
		set({ mod_installation_path });
		debounceCallback(syncSetting);
	},

	selectedGame: undefined,
	setSelectedGame: selectedGame => {
		set({ selectedGame });
		debounceCallback(syncSetting);
	},

	games: [],
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

	nexus_api_key: '',
	setNexusAuthApi: nexus_api_key => {
		set({ nexus_api_key });
		debounceCallback(syncSetting);
	},

	nexus_auth_params: {
		id: null,
		token: null,
	},
	setNexusAuthParams: nexus_auth_params => {
		set({ nexus_auth_params });
		debounceCallback(syncSetting);
	},

	toggle_category: true,
	toggle_conflict: true,
	toggle_version: true,
	toggle_creator: false,

	setColumnSelection: (key, value) => {
		const keyStr = `toggle_${key}`;
		const columns = [
			'toggle_category',
			'toggle_conflict',
			'toggle_version',
			'toggle_creator',
		] as any;
		if (columns.includes(keyStr)) {
			set({ [keyStr]: value });
			debounceCallback(syncSetting);
		}
	},

	dependency_confirmation: 1,
	setDependencyConfirmation: dependency_confirmation => {
		set({ dependency_confirmation });
		debounceCallback(syncSetting);
	},

	sort_by: 'load_order',
	setSortBy: sort_by => {
		set({ sort_by });
		debounceCallback(syncSetting);
	},

	isGameLoading: false,
	setIsGameLoading: (isGameLoading: boolean) => set({ isGameLoading }),

	isGameRunning: false,
	setIsGameRunning: isGameRunning => set({ isGameRunning }),

	shouldLockScreen: false,
	setLockScreen: shouldLockScreen => set({ shouldLockScreen }),

	init_reload: false,
	setInitReload: init_reload => set({ init_reload }),
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
		toggle_creator,
		dependency_confirmation,
		sort_by,
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
		setting.column_selections.version !== toggle_version ||
		setting.column_selections.creator !== toggle_creator
	) {
		setting.column_selections = {
			category: toggle_category,
			conflict: toggle_conflict,
			version: toggle_version,
			creator: toggle_creator,
		};
		changed = true;
	}

	if (setting.dependency_confirmation !== dependency_confirmation) {
		setting.dependency_confirmation = dependency_confirmation;
		changed = true;
	}

	if (setting.sort_by !== sort_by) {
		setting.sort_by = sort_by;
		changed = true;
	}

	if (changed) {
		await setting.save();
	}
};
