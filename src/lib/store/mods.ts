import { create } from 'zustand';

import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';

export type ModItem = {
	identifier: string;
	title: string;
	description: string;
	created_at: number;
	categories: string;
	version: string | number;
	creator_id: string | null;
	creator_name: string | null;
	required_items: string[];
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

type PartialModFileMeta = {
	mod_file_path?: string;
	mod_url?: string | null;
	preview_url?: string | null;
	image_file_path?: string | null;
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
	modFilePath: string;
	setModFilePath: (modFilePath: string) => void;
	modFileMeta: PartialModFileMeta;
	setModFileMeta: (modFileMeta: PartialModFileMeta) => void;
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
		pack_file: '',
	} as any,
	setSelectedMod: selectedMod => {
		set({ selectedMod });
	},
	modFilePath: '',
	setModFilePath: modFilePath => {
		set({ modFilePath });
	},
	modFileMeta: {},
	setModFileMeta: modFileMeta => {
		set({ modFileMeta });
	},
}));
