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

import api, {
	ModItem,
	ModItemSeparatorUnion,
	ModSeparatorItem,
} from '@/lib/api';
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

const SeparatorActions = ({ mod }: { mod: ModSeparatorItem }) => {
	const { init_reload, setInitReload } = settingStore();

	const separators = modSeparatorStore(state => state.data);
	const setSeparators = modSeparatorStore(state => state.setData);
	const setSelectedSeparator = modSeparatorStore(
		state => state.setSelectedSeparator,
	);
	const toggleEditSeparator = modSeparatorStore(
		state => state.toggleEditSeparator,
	);

	const handleDelete = useCallback(() => {
		setSeparators(
			[...separators].filter(fi => fi.identifier !== mod.identifier),
		);
		setInitReload(!init_reload);
	}, [separators, mod.identifier, init_reload, setSeparators, setInitReload]);

	const handleEdit = useCallback(() => {
		setSelectedSeparator(mod);
		toggleEditSeparator();
	}, [mod, setSelectedSeparator, toggleEditSeparator]);

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
							onClick={handleEdit}
						>
							<InfoIcon className="w-3 h-3" />
							Meta Information
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={handleDelete}
						>
							<TrashIcon className="w-3 h-3 text-red-500" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</TableCell>
	);
};

const ModActions = ({ mod }: { mod: ModItem }) => {
	const toggleMetaInfo = modMetaStore(state => state.toggleMetaInfo);
	const setSelectedMetaMod = modMetaStore(state => state.setSelectedMod);

	const toggleSetPriority = modOrderStore(state => state.toggleSetPriority);
	const setSelectedPriorityMod = modOrderStore(state => state.setSelectedMod);

	const toggleModRemove = modsStore(state => state.toggleModRemove);
	const setSelectedRemoveMod = modsStore(state => state.setSelectedMod);

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
		[mod],
	);

	const handleMetaInfo = useCallback(() => {
		setSelectedMetaMod(mod);
		toggleMetaInfo();
	}, [mod, setSelectedMetaMod, toggleMetaInfo]);

	const handleSetPriority = useCallback(() => {
		setSelectedPriorityMod(mod);
		toggleSetPriority();
	}, [mod, setSelectedPriorityMod, toggleSetPriority]);

	const handleRemove = useCallback(() => {
		setSelectedRemoveMod(mod);
		toggleModRemove();
	}, [mod, setSelectedRemoveMod, toggleModRemove]);

	const showExternalLink =
		mod.item_type === 'steam_mod' || (mod.url !== null && mod.url !== '');
	const deleteText = mod.item_type === 'steam_mod' ? 'Unsubscribe' : 'Delete';

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
							onClick={handleMetaInfo}
						>
							<InfoIcon className="w-3 h-3" />
							Meta Information
						</DropdownMenuItem>

						{showExternalLink && (
							<DropdownMenuItem
								className="text-xs py-2 my-0"
								onClick={() => handleOpenUrl(false)}
							>
								<EyeIcon className="w-3 h-3" />
								Open Mod Page in Browser
							</DropdownMenuItem>
						)}

						{mod.item_type === 'steam_mod' && (
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
							onClick={handleSetPriority}
						>
							<ArrowRightIcon className="w-3 h-3" />
							Set Priority
						</DropdownMenuItem>

						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={handleRemove}
						>
							<TrashIcon className="w-3 h-3 text-red-500" />
							{deleteText}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</TableCell>
	);
};

export const Actions = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const isSeparator = !('item_type' in mod);

	if (isSeparator) {
		return <SeparatorActions mod={mod as ModSeparatorItem} />;
	}

	return <ModActions mod={mod as ModItem} />;
};
