import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import { modMetaStore } from '@/lib/store/mod_meta';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

export const Category = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	if (isSeparator(mod)) return;

	const toggle_category = settingStore(state => state.toggle_category);
	const categories = 'categories' in mod ? mod.categories : undefined;

	const metaData = modMetaStore(state => state.data);
	const selectedModMeta = metaData.find(md => md.mod_id === mod.identifier);

	let categoriesTxt = categories;
	if (
		typeof selectedModMeta !== 'undefined' &&
		typeof selectedModMeta.categories !== 'undefined' &&
		selectedModMeta.categories !== null &&
		selectedModMeta.categories !== ''
	) {
		categoriesTxt = selectedModMeta.categories;
	}

	if (toggle_category) {
		return <TableCell className="text-xs">{categoriesTxt ?? ''}</TableCell>;
	}
};
