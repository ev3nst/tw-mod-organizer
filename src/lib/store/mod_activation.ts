import {
	ModGenericModel,
	ModGenericProps,
	ModelConstructor,
	createStore,
} from '@/lib/store/mod_generic';
import type { ModItem } from '@/lib/store/mods';
import { SaveFile } from '@/lib/store/save_files';

export type ModActivationItem = {
	mod_id: string;
	is_active: boolean;
	title: string;
};

export type ModActivation = ModGenericProps<ModActivationItem>;
export class ModActivationModel extends ModGenericModel<
	ModActivation,
	ModActivationItem
> {
	protected getTableName(): string {
		return 'mod_activations';
	}
}

export const modActivationStore = createStore<
	ModActivation,
	ModActivationModel,
	ModActivationItem,
	{
		saveFile?: SaveFile;
		setSaveFile: (saveFile?: SaveFile) => void;
		requiredItemsModal: boolean;
		setRequiredItemsModal: (requiredItemsModal: boolean) => void;
		requiredItemsMod?: ModItem;
		setRequiredItemsMod: (requiredItemsMod?: ModItem) => void;
	}
>({
	model: ModActivationModel as ModelConstructor<
		ModActivation,
		ModActivationModel,
		ModActivationItem
	>,
	initialState: [],
	extend: set => ({
		saveFilePath: undefined,
		setSaveFile: saveFile => {
			set({ saveFile });
		},

		requiredItemsModal: false,
		setRequiredItemsModal: requiredItemsModal =>
			set({ requiredItemsModal }),
		requiredItemsMod: undefined,
		setRequiredItemsMod: requiredItemsMod => set({ requiredItemsMod }),
	}),
});
