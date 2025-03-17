import { ModItem } from '@/lib/api';
import {
	ModGenericModel,
	ModGenericProps,
	createStore,
} from '@/lib/store/mod_generic';

export type ModOrderItem = {
	mod_id: string;
	order: number;
	title: string;
	pack_file_path?: string;
};

export type ModOrder = ModGenericProps<ModOrderItem>;
export class ModOrderModel extends ModGenericModel<ModOrder, ModOrderItem> {
	protected getTableName(): string {
		return 'mod_orders';
	}
}

export const modOrderStore = createStore<
	ModOrder,
	ModOrderModel,
	ModOrderItem,
	{
		priorityOpen: boolean;
		selectedMod: ModItem;
		toggleSetPriority: () => void;
		setSelectedMod: (selectedMod: ModItem) => void;
		selectedRows: Set<string>;
		toggleRow: (modId: string, ctrlKey: boolean) => void;
		clearSelection: () => void;
	}
>({
	model: ModOrderModel,
	initialState: [],
	extend: (set, get) => ({
		priorityOpen: false,
		selectedMod: {
			title: '',
			pack_file: '',
		} as any,
		toggleSetPriority: () => {
			const priorityOpen = !get().priorityOpen;
			set({ priorityOpen });
		},
		setSelectedMod: selectedMod => {
			set({ selectedMod });
		},
		selectedRows: new Set(),
		toggleRow: (modId: string, ctrlKey: boolean) =>
			set((state: any) => {
				const newSelected = new Set(state.selectedRows);

				if (ctrlKey) {
					if (newSelected.has(modId)) {
						newSelected.delete(modId);
					} else {
						newSelected.add(modId);
					}
				} else {
					newSelected.clear();
					newSelected.add(modId);
				}

				return { selectedRows: newSelected };
			}),

		clearSelection: () => set({ selectedRows: new Set() }),
	}),
});
