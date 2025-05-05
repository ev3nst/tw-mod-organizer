import { memo, useMemo } from 'react';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

export const UpdatedAt = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return null;

		const toggle_updated_at = settingStore(
			state => state.toggle_updated_at,
		);

		const updatedAt = 'updated_at' in mod ? mod.updated_at : undefined;

		const formattedDate = useMemo(() => {
			if (!toggle_updated_at || typeof updatedAt !== 'number') {
				return '';
			}

			try {
				const dateUpdatedAt = new Date(updatedAt);
				if (dateUpdatedAt.getFullYear() === 1970) {
					return '';
				}
				return dateUpdatedAt.toLocaleDateString();
			} catch (_e) {
				return updatedAt?.toString() ?? '';
			}
		}, [updatedAt, toggle_updated_at]);

		if (!toggle_updated_at) return null;

		return (
			<div
				className="text-xs select-none"
				style={TABLE_DIMENSIONS.UPDATED_AT}
			>
				{formattedDate}
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
