import { memo } from 'react';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

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
							<div
								className="select-none text-xs"
								style={TABLE_DIMENSIONS.CREATED_AT}
							>
								{''}
							</div>
						);
					}

					return (
						<div
							className="select-none text-xs"
							style={TABLE_DIMENSIONS.CREATED_AT}
						>
							{dateCreatedAt.toLocaleDateString()}
						</div>
					);
				} catch (_e) {}
			}

			return (
				<div
					className="select-none text-xs"
					style={TABLE_DIMENSIONS.CREATED_AT}
				>
					{createdAt ?? ''}
				</div>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
