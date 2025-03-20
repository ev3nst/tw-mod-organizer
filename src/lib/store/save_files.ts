import { create } from 'zustand';

export type SaveFileLoadOrderData = {
	identifier: string;
	title: string;
	pack_file?: string;
	pack_file_path?: string;
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
