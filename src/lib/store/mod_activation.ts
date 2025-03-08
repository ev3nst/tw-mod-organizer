import {
	ModGenericModel,
	ModGenericProps,
	ModelConstructor,
	createStore,
} from '@/lib/store/mod_generic';

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
		saveFilePath?: string;
		setSaveFilePath: (saveFilePath?: string) => void;
	}
>({
	model: ModActivationModel as ModelConstructor<
		ModActivation,
		ModActivationModel,
		ModActivationItem
	>,
	initialState: [],
	extend: set => ({
		saveFilePath: '',
		setSaveFilePath: saveFilePath => {
			set({ saveFilePath });
		},
	}),
});
