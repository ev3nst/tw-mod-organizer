import { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import {
	ModGenericModel,
	ModGenericProps,
	ModelConstructor,
	createStore,
} from '@/lib/store/mod_generic';
import { SettingModel } from '@/lib/store/setting';
import { ModActivationItem } from '@/lib/store/mod_activation';
import { debounceCallback } from '@/lib/utils';
import { isSeparator } from '@/modlist/utils';

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
		toggleMetaInfo: () => void;
		selectedMod: ModItem;
		setSelectedMod: (selectedMod: ModItem) => void;
		bulkCategoryDialogOpen: boolean;
		toggleBulkCategory: () => void;
	}
>({
	model: ModMetaModel as ModelConstructor<ModMeta, ModMetaModel, ModMetaItem>,
	initialState: [],
	extend: (set, get) => ({
		setData: (data: ModMetaItem[]) => {
			set({ data } as any);
			debounceCallback(() => syncData(data));
		},
		metaInfoOpen: false,
		toggleMetaInfo: () => {
			const metaInfoOpen = !get().metaInfoOpen;
			set({ metaInfoOpen });
		},
		selectedMod: {
			title: '',
		} as any,
		setSelectedMod: selectedMod => {
			set({ selectedMod });
		},
		bulkCategoryDialogOpen: false,
		toggleBulkCategory: () => {
			const bulkCategoryDialogOpen = !get().bulkCategoryDialogOpen;
			set({ bulkCategoryDialogOpen });
		},
	}),
});

export function filterMods(
	searchModText: string,
	activationFilter: string,
	mods: ModItemSeparatorUnion[],
	metaData: ModMetaItem[],
	modActiveData: ModActivationItem[],
): ModItemSeparatorUnion[] {
	let filteredData: ModItemSeparatorUnion[] = mods;

	if (searchModText !== '') {
		let searchModTextLower = searchModText.toLocaleLowerCase();
		if (searchModTextLower.startsWith('c:')) {
			searchModTextLower = searchModTextLower.replace('c:', '').trim();
			const dashIndex = searchModTextLower.indexOf('-');
			const categoryPart =
				dashIndex !== -1
					? searchModTextLower.substring(0, dashIndex).trim()
					: searchModTextLower;

			const categoryTerms = categoryPart
				.split(',')
				.map(term => term.trim())
				.filter(term => term !== '');

			const titleTerm =
				dashIndex !== -1
					? searchModTextLower.substring(dashIndex + 1).trim()
					: '';

			filteredData = mods.filter(m => {
				if (isSeparator(m)) {
					return false;
				}

				const matchesAllCategories = categoryTerms.every(term => {
					const matchesModCategory =
						(m as ModItem).categories !== null &&
						(m as ModItem).categories.toLowerCase().includes(term);

					const matchesMetaCategory = metaData.some(
						md =>
							md.mod_id === m.identifier &&
							md.categories.toLowerCase().includes(term),
					);

					return matchesModCategory || matchesMetaCategory;
				});

				let matchesTitle = true;
				if (titleTerm !== '') {
					const matchesModTitle = m.title
						.toLowerCase()
						.includes(titleTerm);

					const matchesMetaTitle = metaData.some(
						md =>
							md.mod_id === m.identifier &&
							typeof md.title !== 'undefined' &&
							md.title.toLowerCase().includes(titleTerm),
					);

					matchesTitle = matchesModTitle || matchesMetaTitle;
				}

				return matchesAllCategories && matchesTitle;
			});
		} else {
			const filterMeta = metaData.filter(
				md =>
					typeof md.title !== 'undefined' &&
					md.title.toLowerCase().includes(searchModTextLower),
			);

			filteredData = mods.filter(m => {
				if (isSeparator(m)) {
					return false;
				}

				if (
					filterMeta.findIndex(f => f.mod_id === m.identifier) !== -1
				) {
					return true;
				}

				return (
					m.title.toLowerCase().includes(searchModTextLower) ||
					((m as ModItem).categories !== null &&
						(m as ModItem).categories
							.toLowerCase()
							.includes(searchModTextLower))
				);
			});
		}
	}

	if (activationFilter !== 'all') {
		filteredData = filteredData.filter(f =>
			modActiveData.some(
				s =>
					s.mod_id === f.identifier &&
					s.is_active === (activationFilter === 'active') &&
					!isSeparator(f),
			),
		);
	}

	return filteredData;
}
