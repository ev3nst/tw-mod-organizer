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

export type ParsedDB = {
	[key: string]: ParsedDB | { [fieldName: string]: any }[];
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

export function getDbTableByPath(obj: any, path: string): any {
	const prefixToRemove = 'db/';
	if (prefixToRemove && path.startsWith(prefixToRemove)) {
		path = path.slice(prefixToRemove.length);
	}

	const keys = path.split('/').filter(Boolean);
	return keys.reduce<any>((acc, key) => acc?.[key], obj);
}

export function getLocTableByPath(obj: any, path: string): any {
	const keys = path.split('/').filter(Boolean);
	return keys.reduce<any>((acc, key) => acc?.[key], obj);
}

const PackPriorityLogic =
	"!#$%&'()+,-;=@0123456789abcdefghijklmnopqrstuvwxyz[]^_`{}~";

export const comparePriority = (a: string, b: string): number => {
	const maxLength = Math.max(a.length, b.length);

	const paddedA = a.padEnd(maxLength, ' ');
	const paddedB = b.padEnd(maxLength, ' ');

	for (let i = 0; i < maxLength; i++) {
		const indexA = PackPriorityLogic.indexOf(paddedA[i]);
		const indexB = PackPriorityLogic.indexOf(paddedB[i]);

		const valueA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
		const valueB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

		if (valueA !== valueB) {
			return valueB - valueA;
		}
	}
	return 0;
};

export type MergedTableData = {
	[tableName: string]:
		| any[]
		| {
				[key: string]: any;
		  };
};

export const mergeModsDbData = (
	modsDbData: Record<string, ParsedDB>,
): MergedTableData => {
	const mergedData: Record<string, ParsedDB> = {};

	for (const [_modFile, modData] of Object.entries(modsDbData)) {
		for (const [tableName, tableData] of Object.entries(modData)) {
			if (!mergedData[tableName]) {
				mergedData[tableName] = {};
			}

			for (const [customTableName, rows] of Object.entries(tableData)) {
				const existingCustomTables = Object.keys(mergedData[tableName]);
				let shouldAdd = true;

				for (const existingCustomTable of existingCustomTables) {
					if (customTableName === existingCustomTable) {
						const comparisonResult = comparePriority(
							customTableName,
							existingCustomTable,
						);
						if (comparisonResult <= 0) {
							mergedData[tableName][customTableName] = rows;
						}
						shouldAdd = false;
						break;
					}
				}

				if (shouldAdd) {
					mergedData[tableName][customTableName] = rows;
				}
			}
		}
	}

	const finalMergedData: Record<string, any> = {};
	for (const [tableName, customTables] of Object.entries(mergedData)) {
		finalMergedData[tableName] = {};

		for (const [_, rows] of Object.entries(customTables)) {
			if (Array.isArray(rows)) {
				if (!Array.isArray(finalMergedData[tableName])) {
					finalMergedData[tableName] = [];
				}
				finalMergedData[tableName] = [
					...finalMergedData[tableName],
					...rows,
				];
			} else if (typeof rows === 'object' && rows !== null) {
				if (!finalMergedData[tableName]) {
					finalMergedData[tableName] = {};
				}
				finalMergedData[tableName] = {
					...finalMergedData[tableName],
					...rows,
				};
			}
		}
	}

	return finalMergedData;
};

export const detectModConflicts = (modsDbData: Record<string, ParsedDB>) => {
	const conflicts: Record<string, Record<string, Record<string, any[]>>> = {};

	const modFiles = Object.keys(modsDbData);

	for (let i = 0; i < modFiles.length; i++) {
		const modA = modFiles[i];
		const modDataA = modsDbData[modA];

		for (let j = i + 1; j < modFiles.length; j++) {
			const modB = modFiles[j];
			const modDataB = modsDbData[modB];

			for (const tableNameA in modDataA) {
				if (tableNameA in modDataB) {
					const tableA = modDataA[tableNameA];
					const tableB = modDataB[tableNameA];

					for (const customTableA in tableA) {
						for (const customTableB in tableB) {
							// @ts-ignore
							const rowsA = tableA[customTableA];
							// @ts-ignore
							const rowsB = tableB[customTableB];

							if (
								!Array.isArray(rowsA) ||
								!Array.isArray(rowsB)
							) {
								continue;
							}

							const conflictedRows: any[] = [];

							const sampleRowA = rowsA[0];
							const idKeys = ['key', 'id', 'group'];
							let idKey = null;

							for (const key of idKeys) {
								if (sampleRowA && key in sampleRowA) {
									idKey = key;
									break;
								}
							}

							if (idKey) {
								for (const rowA of rowsA) {
									const idValueA = rowA[idKey];
									for (const rowB of rowsB) {
										if (rowB[idKey] === idValueA) {
											const comparisonResult =
												comparePriority(
													customTableA,
													customTableB,
												);

											const winningTable =
												comparisonResult <= 0
													? customTableA
													: customTableB;
											const losingTable =
												comparisonResult <= 0
													? customTableB
													: customTableA;
											const winnerData =
												comparisonResult <= 0
													? rowA
													: rowB;
											const loserData =
												comparisonResult <= 0
													? rowB
													: rowA;

											conflictedRows.push({
												idKey,
												idValue: idValueA,
												winningTable,
												losingTable,
												winnerData,
												loserData,
											});
										}
									}
								}
							}

							if (conflictedRows.length > 0) {
								if (!conflicts[modA]) conflicts[modA] = {};
								if (!conflicts[modA][modB])
									conflicts[modA][modB] = {};
								if (!conflicts[modA][modB][tableNameA])
									conflicts[modA][modB][tableNameA] = [];

								conflicts[modA][modB][tableNameA].push(
									...conflictedRows,
								);

								if (!conflicts[modB]) conflicts[modB] = {};
								if (!conflicts[modB][modA])
									conflicts[modB][modA] = {};
								if (!conflicts[modB][modA][tableNameA])
									conflicts[modB][modA][tableNameA] = [];

								conflicts[modB][modA][tableNameA].push(
									...conflictedRows.map(row => ({
										...row,
										winningTable: row.losingTable,
										losingTable: row.winningTable,
										winnerData: row.loserData,
										loserData: row.winnerData,
									})),
								);
							}
						}
					}
				}
			}
		}
	}

	return conflicts;
};
