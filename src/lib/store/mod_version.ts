import {
	ModGenericModel,
	ModGenericProps,
	ModelConstructor,
	createStore,
} from '@/lib/store/mod_generic';
import { SettingModel } from '@/lib/store/setting';
import { debounceCallback } from '@/lib/utils';

export type ModVersionItem = {
	mod_id: string;
	mod_type: 'steam_mod' | 'nexus_mod' | 'base_mod' | 'local_mod';
	title: string;
	version: string | number;
	last_time_checked: number;
	latest_version: string | number;
	url?: string;
};

export type ModVersion = ModGenericProps<ModVersionItem>;
export class ModVersionModel extends ModGenericModel<
	ModVersion,
	ModVersionItem
> {
	protected getTableName(): string {
		return 'mod_versions';
	}
}

const createSyncData = () => {
	return async (dataToSync: ModVersionItem[]) => {
		const setting = await SettingModel.retrieve();
		if (!setting.selected_game) return;

		const instance = await ModVersionModel.retrieve(
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

export const modVersionStore = createStore<
	ModVersion,
	ModVersionModel,
	ModVersionItem,
	{
		changedMods: ModVersionItem[];
		setChangedMods: (changedMods: ModVersionItem[]) => void;
		versionInfoOpen: boolean;
		toggleVersionInfo: (versionInfoOpen: boolean) => void;
	}
>({
	model: ModVersionModel as ModelConstructor<
		ModVersion,
		ModVersionModel,
		ModVersionItem
	>,
	initialState: [],
	extend: set => ({
		setData: (data: ModVersionItem[]) => {
			set({ data } as any);
			debounceCallback(() => syncData(data));
		},
		changedMods: [],
		setChangedMods: changedMods => set({ changedMods }),
		versionInfoOpen: false,
		toggleVersionInfo: versionInfoOpen => set({ versionInfoOpen }),
	}),
});
