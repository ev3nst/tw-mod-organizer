import { memo, useMemo } from 'react';

import { settingStore } from '@/lib/store/setting';
import { modMetaStore } from '@/lib/store/mod_meta';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

export const Category = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return;

		const toggle_category = settingStore(state => state.toggle_category);
		const categories = 'categories' in mod ? mod.categories : undefined;

		const metaData = modMetaStore(state => state.data);

		const categoriesTxt = useMemo(() => {
			const selectedMeta = metaData.find(
				md => md.mod_id === mod.identifier,
			);

			let finalCategories = categories;
			if (
				typeof selectedMeta !== 'undefined' &&
				typeof selectedMeta.categories !== 'undefined' &&
				selectedMeta.categories !== null &&
				selectedMeta.categories !== ''
			) {
				finalCategories = selectedMeta.categories;
			}

			return finalCategories;
		}, [metaData, mod.identifier, categories]);

		if (toggle_category) {
			return (
				<div
					className="text-xs select-none flex items-center"
					style={TABLE_DIMENSIONS.CATEGORY}
				>
					{categoriesTxt ?? ''}
				</div>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
