import { create } from 'zustand';

export type TreeItem = {
	id: string;
	label: string;
	pack_file_name: string;
	pack_file_path: string;
	preview_local?: string | null;
	preview_url?: string | null;
	children?: TreeItem[];
};

type PackManagerStore = {
	packTree: TreeItem[];
	setPackTree: (packTree: TreeItem[]) => void;

	selectedTreeItem?: TreeItem;
	selectedTreeItemData?: {
		type: string;
		content: any;
	};
	treeItemDataLoading: boolean;
	setTreeItemDataLoading: (loading: boolean) => void;
	setSelectedTreeItem: (selectedTreeItem: TreeItem) => void;
	setSelectedTreeItemData: (selectedTreeItemData: {
		type: string;
		content: any;
	}) => void;
};

export const packManagerStore = create<PackManagerStore>(set => ({
	packTree: [],
	setPackTree: packTree => set({ packTree }),

	treeItemDataLoading: false,
	setTreeItemDataLoading: treeItemDataLoading => set({ treeItemDataLoading }),

	selectedTreeItem: undefined,
	selectedTreeItemData: undefined,
	setSelectedTreeItem: selectedTreeItem => set({ selectedTreeItem }),
	setSelectedTreeItemData: selectedTreeItemData =>
		set({ selectedTreeItemData }),
}));
