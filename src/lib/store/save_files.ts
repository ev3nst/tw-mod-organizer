import { create } from 'zustand';

export type SaveFile = {
	filename: string;
	filesize: number;
	date: number;
	path: string;
	meta_exists: boolean;
};

export type SaveFileLoadOrderData = {
	identifier: string;
	title: string;
	mod_file?: string;
	mod_file_path?: string;
	is_active: boolean;
	order_index: number;
	background_color?: string;
	text_color?: string;
};

type SaveFilesStore = {
	saveFileDialogOpen: boolean;
	setSaveFileDialogOpen: (saveFileDialogOpen: boolean) => void;
	selectedSaveFile?: {
		filename: string;
		filesize: number;
		path: string;
		load_order_data: SaveFileLoadOrderData[];
	};
	setSelectedSaveFile: (selectedSaveFile: {
		filename: string;
		filesize: number;
		path: string;
		load_order_data: SaveFileLoadOrderData[];
	}) => void;
	currentlyRunningMods: SaveFileLoadOrderData[];
	setCurrentlyRunningMods: (
		currentlyRunningMods: SaveFileLoadOrderData[],
	) => void;
};

export const saveFilesStore = create<SaveFilesStore>(set => ({
	saveFileDialogOpen: false,
	setSaveFileDialogOpen: saveFileDialogOpen => set({ saveFileDialogOpen }),
	selectedSaveFile: undefined,
	setSelectedSaveFile: selectedSaveFile => set({ selectedSaveFile }),
	currentlyRunningMods: [],
	setCurrentlyRunningMods: currentlyRunningMods =>
		set({ currentlyRunningMods }),
}));
