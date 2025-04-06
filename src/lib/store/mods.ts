import { create } from 'zustand';

import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';

export type ModItem = {
	game_specific_id: string;
	identifier: string;
	title: string;
	description: string;
	created_at: number;
	updated_at: number;
	categories: string;
	version: string | number;
	creator_id: string | null;
	creator_name: string | null;
	required_items: string[];
	child_mods?: string[];
	item_type: 'steam_mod' | 'nexus_mod' | 'base_mod' | 'local_mod';
	url?: string;
	download_url?: string;
	preview_url?: string | null;
	mod_file: string;
	mod_file_path: string;
	preview_local: string;
	// separator type workaround to supress error
	background_color?: string;
	text_color?: string;
};

type DownloadedModMeta = {
	mod_file_path?: string;
	mod_url?: string | null;
	download_url?: string | null;
	preview_url?: string | null;
	image_file_path?: string | null;
	creator_id?: string | null;
	creator_name?: string | null;
	version?: string | null;
};

type ModsStore = {
	installModItemOpen: boolean;
	setInstallModItemOpen: (installModItemOpen: boolean) => void;
	mods: ModItemSeparatorUnion[];
	setMods: (mods: ModItemSeparatorUnion[]) => void;
	removeModOpen: boolean;
	toggleModRemove: () => void;
	selectedMod: ModItem;
	setSelectedMod: (selectedMod: ModItem) => void;
	downloadedArchivePath: string;
	setDownloadedArchivePath: (downloadedArchivePath: string) => void;
	downloadedModMeta: DownloadedModMeta;
	setDownloadedModMeta: (downloadedModMeta: DownloadedModMeta) => void;
};

export const modsStore = create<ModsStore>((set, get) => ({
	installModItemOpen: false,
	setInstallModItemOpen: installModItemOpen => set({ installModItemOpen }),
	mods: [],
	setMods: mods => set({ mods }),
	removeModOpen: false,
	toggleModRemove: () => {
		const removeModOpen = !get().removeModOpen;
		set({ removeModOpen });
	},
	selectedMod: {
		title: '',
		mod_file: '',
	} as any,
	setSelectedMod: selectedMod => {
		set({ selectedMod });
	},
	downloadedArchivePath: '',
	setDownloadedArchivePath: downloadedArchivePath => {
		set({ downloadedArchivePath });
	},
	downloadedModMeta: {},
	setDownloadedModMeta: downloadedModMeta => {
		set({ downloadedModMeta });
	},
}));
