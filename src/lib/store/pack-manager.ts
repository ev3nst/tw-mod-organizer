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

export type PackDBField = {
	ca_order: number;
	default_value: any;
	description: string;
	enum_values: any;
	field_type: string;
	filename_relative_path: string | null;
	is_bitwise: number;
	is_filename: boolean;
	is_key: boolean;
	is_part_of_colour: any;
	is_reference: any;
	lookup: any;
	name: string;
};

export type PackDBRow = {
	definition: {
		fields: PackDBField[];
		localised_fields: PackDBField[];
		localised_key_order: number[];
		version: number;
	};
	definition_patch: {
		[key: string]: any;
	};
	table_name: string;
	table_data: {
		[key: string]: any;
	}[];
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

	selectedTreeItemDb?: {
		pack_file: string;
		data: any;
	};
	setSelectedTreeItemDb: (selectedTreeItemDb: {
		pack_file: string;
		data: any;
	}) => void;

	selectedTreeItemLoc?: {
		pack_file: string;
		data: any;
	};
	setSelectedTreeItemLoc: (selectedTreeItemLoc: {
		pack_file: string;
		data: any;
	}) => void;

	longTextDialogOpen: boolean;
	setLongTextDialogOpen: (longTextDialogOpen: boolean) => void;
	longText?: {
		key?: string;
		value: string;
	};
	setLongText: (longText: { key?: string; value: string }) => void;
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

	selectedTreeItemDb: undefined,
	setSelectedTreeItemDb: selectedTreeItemDb => set({ selectedTreeItemDb }),

	selectedTreeItemLoc: undefined,
	setSelectedTreeItemLoc: selectedTreeItemLoc => set({ selectedTreeItemLoc }),

	longTextDialogOpen: false,
	setLongTextDialogOpen: longTextDialogOpen => set({ longTextDialogOpen }),
	longText: undefined,
	setLongText: longText => set({ longText }),
}));

export async function parseRawPackDB(db_data_raw: {
	[key: string]: PackDBRow;
}) {
	let modDbParsed: any = {};

	const dbTablePaths = Object.keys(db_data_raw);

	for (let dbi = 0; dbi < dbTablePaths.length; dbi++) {
		const rawPath = dbTablePaths[dbi];
		const db_path_clean = rawPath.substring(3);
		const db_path_split = db_path_clean.split('/');

		const definition = db_data_raw[rawPath].definition;
		definition.fields.sort((a, b) => a.ca_order - b.ca_order);

		const parsedRows = db_data_raw[rawPath].table_data.map(rowArray => {
			let rowObj: any = {};
			for (let fi = 0; fi < definition.fields.length; fi++) {
				const field = definition.fields[fi];
				const cell = rowArray[fi];

				if (cell !== undefined && cell !== null) {
					rowObj[field.name] = Object.values(cell)[0];
				}
			}
			return rowObj;
		});

		let current = modDbParsed;
		for (let i = 0; i < db_path_split.length; i++) {
			const part = db_path_split[i];

			if (i === db_path_split.length - 1) {
				current[part] = parsedRows;
			} else {
				if (!current[part]) current[part] = {};
				current = current[part];
			}
		}
	}

	return modDbParsed;
}

export function convertPackFilesToTree(
	packFiles: Record<string, any>,
	parentPath: string = '',
	treeItem: TreeItem,
): TreeItem[] {
	const result: TreeItem[] = [];

	for (const [key, value] of Object.entries(packFiles)) {
		if (!value || typeof value !== 'object') continue;

		const currentPath = parentPath ? `${parentPath}/${key}` : key;
		const node: TreeItem = {
			id: currentPath,
			label: key,
			pack_file_name: treeItem.pack_file_name,
			pack_file_path: treeItem.pack_file_path,
			children: [],
		};

		if (Array.isArray(value)) {
			node.children = value.map((file: string) => ({
				id: `${currentPath}/${file}`,
				label: file,
				pack_file_name: treeItem.pack_file_name,
				pack_file_path: treeItem.pack_file_path,
			}));
		} else {
			if (typeof node.children === 'undefined') {
				node.children = [];
			}

			for (const [subKey, subValue] of Object.entries(value)) {
				const subNode = convertPackFilesToTree(
					{ [subKey]: subValue },
					currentPath,
					treeItem,
				);
				node.children.push(...subNode);
			}
		}

		result.push(node);
	}

	return result;
}

export function getParentPaths(itemId: string): string[] {
	const parts = itemId.split('/');
	const paths: string[] = [];
	let currentPath = '';

	for (let i = 0; i < parts.length - 1; i++) {
		currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
		paths.push(currentPath);
	}

	return paths;
}
