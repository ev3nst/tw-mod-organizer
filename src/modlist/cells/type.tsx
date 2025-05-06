import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FileIcon } from 'lucide-react';

import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

const ICON_SIZE = 20;

export const Type = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return null;

		const type = 'item_type' in mod ? mod.item_type : undefined;

		const { selectedGame, toggle_type } = settingStore(
			useShallow(state => ({
				selectedGame: state.selectedGame,
				toggle_type: state.toggle_type,
			})),
		);

		const typeToRender = useMemo(() => {
			switch (type) {
				case 'base_mod':
					switch (selectedGame?.slug) {
						case 'mbbl':
							return (
								<img
									src="/mbbl.jpg"
									className="rounded-full object-cover"
									style={{
										width: ICON_SIZE,
										height: ICON_SIZE,
									}}
									alt="Bannerlord Logo"
								/>
							);
						default:
							return type;
					}

				case 'steam_mod':
					return (
						<img
							src="/steam-logo.png"
							className="rounded-full object-cover"
							style={{ width: ICON_SIZE, height: ICON_SIZE }}
							alt="Steam Logo"
						/>
					);

				case 'nexus_mod':
					return (
						<img
							src="/nexus-logo.png"
							className="rounded-full object-cover"
							style={{ width: ICON_SIZE, height: ICON_SIZE }}
							alt="Nexus Logo"
						/>
					);

				case 'local_mod':
					return (
						<FileIcon
							className="select-none rounded-full object-cover"
							style={{ width: ICON_SIZE, height: ICON_SIZE }}
						/>
					);

				default:
					return type;
			}
		}, [type, selectedGame?.slug]);

		if (!toggle_type) return null;

		return (
			<div
				className="flex select-none items-center justify-center text-center text-xs"
				style={TABLE_DIMENSIONS.TYPE}
			>
				{typeToRender}
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
