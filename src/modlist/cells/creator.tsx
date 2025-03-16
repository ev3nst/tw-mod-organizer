import { TableCell } from '@/components/table';

import type { ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { isSeparator } from '@/modlist/utils';

export const Creator = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	if (isSeparator(mod)) return;

	let creator_name = 'creator_name' in mod ? mod.creator_name : undefined;
	const toggle_creator = settingStore(state => state.toggle_creator);
	if (toggle_creator) {
		return <TableCell className="text-xs">{creator_name ?? ''}</TableCell>;
	}
};
