import { create } from 'zustand';

import type { ModItem, ModItemSeparatorUnion } from '@/lib/api';

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
