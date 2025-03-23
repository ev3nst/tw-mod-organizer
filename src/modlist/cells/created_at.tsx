import { memo } from 'react';

import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

export const CreatedAt = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return null;

		const createdAt = 'created_at' in mod ? mod.created_at : undefined;
		const toggle_created_at = settingStore(
			state => state.toggle_created_at,
		);

		if (toggle_created_at) {
			if (typeof createdAt === 'number') {
				try {
					const dateCreatedAt = new Date(createdAt);
					if (dateCreatedAt.getFullYear() === 1970) {
						return (
							<TableCell className="text-xs select-none">
								{''}
							</TableCell>
						);
					}

					return (
						<TableCell className="text-xs select-none">
							{dateCreatedAt.toLocaleDateString()}
						</TableCell>
					);
				} catch (_e) {}
			}

			return (
				<TableCell className="text-xs select-none">
					{createdAt ?? ''}
				</TableCell>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
