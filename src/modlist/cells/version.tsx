import { memo, useMemo } from 'react';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

export const Version = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return;

		const version = 'version' in mod ? mod.version : undefined;
		const toggle_version = settingStore(state => state.toggle_version);

		const formattedVersion = useMemo(() => {
			if (!toggle_version) {
				return '';
			}

			if (typeof version === 'number') {
				try {
					return new Date(version).toLocaleDateString();
				} catch (_e) {
					return version.toString();
				}
			}

			return version ?? '';
		}, [version, toggle_version]);

		if (!toggle_version) return null;

		return (
			<div
				className="flex select-none items-center text-xs"
				style={TABLE_DIMENSIONS.VERSION}
			>
				{formattedVersion}
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
