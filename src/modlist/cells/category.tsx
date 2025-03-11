import { TableCell } from '@/components/table';

import type { ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modMetaStore } from '@/lib/store/mod_meta';

export const Category = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const item_type = 'item_type' in mod ? mod.item_type : undefined;
	if (!item_type) return;

	const toggle_category = settingStore(state => state.toggle_category);
	const categories = 'categories' in mod ? mod.categories : undefined;

	const metaData = modMetaStore(state => state.data);
	const selectedModMeta = metaData.find(md => md.mod_id === mod.identifier);

	let categoriesTxt = categories;
	if (
		typeof selectedModMeta !== 'undefined' &&
		selectedModMeta.categories !== null &&
		selectedModMeta.categories !== ''
	) {
		categoriesTxt = selectedModMeta.categories;
	}

	if (toggle_category) {
		return <TableCell className="text-xs">{categoriesTxt ?? ''}</TableCell>;
	}
};
