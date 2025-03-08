import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import type { ModItemSeparatorUnion } from '@/lib/api';

export const Category = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const item_type = 'item_type' in mod ? mod.item_type : undefined;
	if (!item_type) return;

	const toggle_category = settingStore(state => state.toggle_category);
	const categories = 'categories' in mod ? mod.categories : undefined;
	if (toggle_category) {
		return <TableCell className="text-xs">{categories ?? ''}</TableCell>;
	}
};
