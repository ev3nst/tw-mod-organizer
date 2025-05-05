import { memo } from 'react';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

export const Creator = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return;

		let creator_name = 'creator_name' in mod ? mod.creator_name : undefined;
		const toggle_creator = settingStore(state => state.toggle_creator);

		if (toggle_creator) {
			return (
				<div className="text-xs" style={TABLE_DIMENSIONS.CREATOR}>
					{creator_name ?? ''}
				</div>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
