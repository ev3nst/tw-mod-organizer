import { useCallback } from 'react';
import {
	ArrowRightIcon,
	EllipsisVerticalIcon,
	EyeIcon,
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

import api, { ModItem } from '@/lib/api';
import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { toastError } from '@/lib/utils';

function determineModUrl(mod: ModItem, inSteamClient: boolean = false) {
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

export const Actions = ({ mod }: { mod: ModItem }) => {
	const item_type = 'item_type' in mod ? mod.item_type : 'separator';
	if (item_type === 'separator') return null;

	const setSelectedPriorityMod = modOrderStore(state => state.setSelectedMod);
	const toggleSetPriority = modOrderStore(state => state.toggleSetPriority);

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
						{mod && mod.url !== null && mod.url !== '' && (
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
								setSelectedPriorityMod(mod);
								toggleSetPriority();
							}}
						>
							<ArrowRightIcon className="w-3 h-3" />
							Set Priority
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={() => {
								setSelectedRemoveMod(mod);
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
