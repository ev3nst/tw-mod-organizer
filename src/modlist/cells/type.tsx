import { memo } from 'react';
import { TableCell } from '@/components/table';
import { settingStore } from '@/lib/store/setting';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { FileIcon } from 'lucide-react';

const ICON_SIZE = 20;

export const Type = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return null;

		const type = 'item_type' in mod ? mod.item_type : undefined;
		const selectedGame = settingStore(state => state.selectedGame);
		const toggle_type = settingStore(state => state.toggle_type);

		let typeToRender: any = type;
		switch (type) {
			case 'base_mod':
				switch (selectedGame?.slug) {
					case 'mbbl':
						typeToRender = (
							<img
								src="/mbbl.jpg"
								className="rounded-full object-cover"
								style={{ width: ICON_SIZE, height: ICON_SIZE }}
								alt="Bannerlord Logo"
							/>
						);
						break;
					default:
						break;
				}
				break;

			case 'steam_mod':
				typeToRender = (
					<img
						src="/steam-logo.png"
						className="rounded-full object-cover"
						style={{ width: ICON_SIZE, height: ICON_SIZE }}
						alt="Steam Logo"
					/>
				);
				break;

			case 'nexus_mod':
				typeToRender = (
					<img
						src="/nexus-logo.png"
						className="rounded-full object-cover"
						style={{ width: ICON_SIZE, height: ICON_SIZE }}
						alt="Nexus Logo"
					/>
				);
				break;

			case 'local_mod':
				typeToRender = (
					<FileIcon
						className="rounded-full object-cover select-none"
						style={{ width: ICON_SIZE, height: ICON_SIZE }}
					/>
				);
				break;

			default:
				break;
		}

		if (toggle_type) {
			return (
				<TableCell className="text-xs select-none text-center w-[40px] h-full align-middle">
					<div className="flex items-center justify-center h-full w-full">
						{typeToRender}
					</div>
				</TableCell>
			);
		}

		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
