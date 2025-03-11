import { ModSeparatorItem } from '@/lib/api';
import {
	createStore,
	ModGenericModel,
	ModGenericProps,
} from '@/lib/store/mod_generic';
import { debounceCallback } from '@/lib/utils';

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
	{ toggleCollapse: (separatorId: string) => void }
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
	}),
});

export function isCollapsed(data: ModSeparatorItem[], separatorId: string) {
	const findIndex = data.findIndex(f => f.identifier === separatorId);
	return typeof data[findIndex] !== 'undefined'
		? data[findIndex].collapsed
		: false;
}
