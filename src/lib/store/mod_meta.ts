import { ModItem } from '@/lib/api';
import {
	ModGenericModel,
	ModGenericProps,
	ModelConstructor,
	createStore,
} from '@/lib/store/mod_generic';
import { debounceCallback } from '@/lib/utils';
import { SettingModel } from './setting';

export type ModMetaItem = {
	mod_id: string;
	title: string;
	categories: string;
	version: string | number;
};

export type ModMeta = ModGenericProps<ModMetaItem>;
export class ModMetaModel extends ModGenericModel<ModMeta, ModMetaItem> {
	protected getTableName(): string {
		return 'mod_metas';
	}
}

const createSyncData = () => {
	return async (dataToSync: ModMetaItem[]) => {
		const setting = await SettingModel.retrieve();
		if (!setting.selected_game) return;

		const instance = await ModMetaModel.retrieve(
			undefined,
			setting.selected_game,
		);
		if (instance) {
			instance.data = dataToSync;
			await instance.save();
		}
	};
};
const syncData = createSyncData();

export const modMetaStore = createStore<
	ModMeta,
	ModMetaModel,
	ModMetaItem,
	{
		metaInfoOpen: boolean;
		selectedMod: ModItem;
		toggleMetaInfo: () => void;
		setSelectedMod: (selectedMod: ModItem) => void;
	}
>({
	model: ModMetaModel as ModelConstructor<ModMeta, ModMetaModel, ModMetaItem>,
	initialState: [],
	extend: (set, get) => ({
		metaInfoOpen: false,
		selectedMod: {
			title: '',
		} as any,
		setData: (data: ModMetaItem[]) => {
			set({ data } as any);
			debounceCallback(() => syncData(data));
		},
		toggleMetaInfo: () => {
			const metaInfoOpen = !get().metaInfoOpen;
			set({ metaInfoOpen });
		},
		setSelectedMod: selectedMod => {
			set({ selectedMod });
		},
	}),
});
