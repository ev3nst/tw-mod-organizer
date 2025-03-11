import { useCallback } from 'react';
import {
	ArrowRightIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	InfoIcon,
	TrashIcon,
} from 'lucide-react';

import { TableCell } from '@/components/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';

import { settingStore } from '@/lib/store/setting';
import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modSeparatorStore } from '@/lib/store/mod_separator';
import { modMetaStore } from '@/lib/store/mod_meta';

import api, { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { toastError } from '@/lib/utils';

function determineModUrl(
	mod: ModItemSeparatorUnion,
	inSteamClient: boolean = false,
) {
	let modUrl = 'url' in mod ? mod.url : undefined;
	const itemType = 'item_type' in mod ? mod.item_type : 'separator';
	if (!modUrl && itemType === 'steam_mod') {
		modUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.identifier}`;

		if (inSteamClient) {
			return `steam://openurl/${modUrl}`;
		}
	}

	return modUrl;
}

export const Actions = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const item_type = 'item_type' in mod ? mod.item_type : 'separator';

	const init_reload = settingStore(state => state.init_reload);
	const setInitReload = settingStore(state => state.setInitReload);

	const separators = modSeparatorStore(state => state.data);
	const setSeparators = modSeparatorStore(state => state.setData);

	const setSelectedPriorityMod = modOrderStore(state => state.setSelectedMod);
	const toggleSetPriority = modOrderStore(state => state.toggleSetPriority);

	const setSelectedMetaMod = modMetaStore(state => state.setSelectedMod);
	const toggleMetaInfo = modMetaStore(state => state.toggleMetaInfo);

	const setSelectedRemoveMod = modsStore(state => state.setSelectedMod);
	const toggleModRemove = modsStore(state => state.toggleModRemove);

	const handleOpenUrl = useCallback(
		async (inSteamClient: boolean = false) => {
			const modUrl = determineModUrl(mod, inSteamClient);
			if (!modUrl) return;
			try {
				await api.open_external_url(modUrl);
			} catch (error) {
				toastError(error);
			}
		},
		[mod.identifier],
	);

	if (item_type === 'separator') {
		const { background_color, text_color } = mod;
		const cellStyle = {
			backgroundColor: background_color,
			color: text_color,
		};
		return (
			<TableCell style={cellStyle}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<div className="w-full flex items-center justify-center p-0">
							<EllipsisVerticalIcon className="w-4 h-4" />
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56">
						<DropdownMenuGroup>
							<DropdownMenuItem
								className="text-xs py-2 my-0"
								onClick={() => {
									setSeparators(
										[...separators].filter(
											fi =>
												fi.identifier !==
												mod.identifier,
										),
									);
									setInitReload(!init_reload);
								}}
							>
								<TrashIcon className="w-3 h-3 text-red-500" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		);
	}

	return (
		<TableCell>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<div className="w-full flex items-center justify-center p-0">
						<EllipsisVerticalIcon className="w-4 h-4" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56">
					<DropdownMenuGroup>
						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={() => {
								setSelectedMetaMod(mod as ModItem);
								toggleMetaInfo();
							}}
						>
							<InfoIcon className="w-3 h-3" />
							Meta Information
						</DropdownMenuItem>
						{mod &&
							(mod as ModItem).url !== null &&
							(mod as ModItem).url !== '' && (
								<DropdownMenuItem
									className="text-xs py-2 my-0"
									onClick={() => handleOpenUrl(false)}
								>
									<EyeIcon className="w-3 h-3" />
									Open Mod Page in Browser
								</DropdownMenuItem>
							)}
						{item_type === 'steam_mod' && (
							<DropdownMenuItem
								className="text-xs py-2 my-0"
								onClick={() => handleOpenUrl(true)}
							>
								<EyeIcon className="w-3 h-3" />
								Open Mod Page in Steam Client
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={() => {
								setSelectedPriorityMod(mod as ModItem);
								toggleSetPriority();
							}}
						>
							<ArrowRightIcon className="w-3 h-3" />
							Set Priority
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={() => {
								setSelectedRemoveMod(mod as ModItem);
								toggleModRemove();
							}}
						>
							<TrashIcon className="w-3 h-3 text-red-500" />
							{item_type === 'steam_mod'
								? 'Unsubscribe'
								: 'Delete'}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</TableCell>
	);
};
