import { memo } from 'react';

import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

export const Version = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return;

		let version = 'version' in mod ? mod.version : undefined;
		const toggle_version = settingStore(state => state.toggle_version);
		if (toggle_version) {
			if (typeof version === 'number') {
				try {
					const dateVersion = new Date(version).toLocaleDateString();
					return (
						<TableCell className="text-xs select-none">
							{dateVersion}
						</TableCell>
					);
				} catch (_e) {}
			}

			return (
				<TableCell className="text-xs select-none">
					{version ?? ''}
				</TableCell>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
