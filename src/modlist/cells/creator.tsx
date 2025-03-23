import { memo } from 'react';

import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

export const Creator = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return;

		let creator_name = 'creator_name' in mod ? mod.creator_name : undefined;
		const toggle_creator = settingStore(state => state.toggle_creator);
		if (toggle_creator) {
			return (
				<TableCell className="text-xs">{creator_name ?? ''}</TableCell>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
