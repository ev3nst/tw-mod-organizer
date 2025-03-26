import { memo } from 'react';

import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

export const UpdatedAt = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return null;

		const updatedAt = 'updated_at' in mod ? mod.updated_at : undefined;
		const toggle_updated_at = settingStore(
			state => state.toggle_updated_at,
		);

		if (toggle_updated_at) {
			if (typeof updatedAt === 'number') {
				try {
					const dateUpdatedAt = new Date(updatedAt);
					if (dateUpdatedAt.getFullYear() === 1970) {
						return (
							<TableCell className="text-xs select-none">
								{''}
							</TableCell>
						);
					}

					return (
						<TableCell className="text-xs select-none">
							{dateUpdatedAt.toLocaleDateString()}
						</TableCell>
					);
				} catch (_e) {}
			}

			return (
				<TableCell className="text-xs select-none">
					{updatedAt ?? ''}
				</TableCell>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
