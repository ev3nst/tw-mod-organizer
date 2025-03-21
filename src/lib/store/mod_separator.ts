import {
	createStore,
	ModGenericModel,
	ModGenericProps,
} from '@/lib/store/mod_generic';
import type { ModItem } from '@/lib/store/mods';
import { debounceCallback } from '@/lib/utils';

export type ModSeparatorItem = {
	identifier: string;
	title: string;
	order: number;
	background_color: string;
	text_color: string;
	collapsed: boolean;
};

export type ModItemSeparatorUnion = ModSeparatorItem | ModItem;
export type ModSeparator = ModGenericProps<ModSeparatorItem>;
export class ModSeparatorModel extends ModGenericModel<
	ModSeparator,
	ModSeparatorItem
> {
	protected getTableName(): string {
		return 'mod_separators';
	}
}

export const modSeparatorStore = createStore<
	ModSeparator,
	ModSeparatorModel,
	ModSeparatorItem,
	{
		toggleCollapse: (separatorId: string) => void;
		selectedSeparator?: ModSeparatorItem;
		setSelectedSeparator: (separator: ModSeparatorItem) => void;
		editSeparatorDialogOpen: boolean;
		toggleEditSeparator: () => void;
	}
>({
	model: ModSeparatorModel,
	initialState: [],
	extend: (set, get, { syncData }) => ({
		toggleCollapse: (separatorId: string) => {
			const data: ModSeparatorItem[] = get().data;
			const findIndex = data.findIndex(f => f.identifier === separatorId);
			const newData = data.map((item, index) =>
				index === findIndex
					? { ...item, collapsed: !item.collapsed }
					: item,
			);
			set({ data: newData });
			debounceCallback(() => syncData(newData));
		},
		selectedSeparator: undefined,
		setSelectedSeparator: selectedSeparator => set({ selectedSeparator }),
		editSeparatorDialogOpen: false,
		toggleEditSeparator: () => {
			const editSeparatorDialogOpen = !get().editSeparatorDialogOpen;
			set({ editSeparatorDialogOpen });
		},
	}),
});

export function isCollapsed(data: ModSeparatorItem[], separatorId: string) {
	const findIndex = data.findIndex(f => f.identifier === separatorId);
	return typeof data[findIndex] !== 'undefined'
		? data[findIndex].collapsed
		: false;
}

export const isSeparator = (mod: ModItemSeparatorUnion): boolean =>
	!('item_type' in mod);

export const findSeparatorPositions = (
	mods: ModItemSeparatorUnion[],
): { id: string; index: number }[] =>
	mods
		.map((mod, index) =>
			isSeparator(mod) ? { id: mod.identifier, index } : null,
		)
		.filter(Boolean) as { id: string; index: number }[];

export const getChildMods = (
	items: ModItemSeparatorUnion[],
	separatorId: string,
): ModItem[] => {
	let collecting = false;
	const children: ModItem[] = [];

	for (const item of items) {
		if (item.identifier === separatorId) {
			collecting = true;
			continue;
		}
		if (collecting) {
			if (isSeparator(item)) break;
			children.push(item as ModItem);
		}
	}
	return children;
};
