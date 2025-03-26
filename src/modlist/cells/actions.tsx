import { memo, useCallback } from 'react';
import {
	ArrowRightIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	InfoIcon,
	LinkIcon,
	TrashIcon,
	UserIcon,
} from 'lucide-react';

import { TableCell } from '@/components/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import {
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
} from '@/components/context-menu';

import api from '@/lib/api';
import { IGameMeta, settingStore } from '@/lib/store/setting';
import { modsStore, type ModItem } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import {
	modSeparatorStore,
	isSeparator,
	type ModSeparatorItem,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { modMetaStore } from '@/lib/store/mod_meta';
import { toastError } from '@/lib/utils';

export const Actions = memo(
	({
		mod,
		ModActionRenderer,
	}: {
		mod: ModItemSeparatorUnion;
		ModActionRenderer: any;
	}) => {
		if (isSeparator(mod)) {
			return (
				<SeparatorActions
					mod={mod as ModSeparatorItem}
					ModActionRenderer={ModActionRenderer}
				/>
			);
		}

		return (
			<ModActions
				mod={mod as ModItem}
				ModActionRenderer={ModActionRenderer}
			/>
		);
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);

const SeparatorActions = ({
	mod,
	ModActionRenderer,
}: {
	mod: ModSeparatorItem;
	ModActionRenderer: any;
}) => {
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
		<ModActionRenderer
			isModSeparator={true}
			mod={mod}
			cellStyle={cellStyle}
			handleEdit={handleEdit}
			handleDelete={handleDelete}
		/>
	);
};

const ModActions = ({
	mod,
	ModActionRenderer,
}: {
	mod: ModItem;
	ModActionRenderer: any;
}) => {
	const selectedGame = settingStore(state => state.selectedGame);

	const toggleMetaInfo = modMetaStore(state => state.toggleMetaInfo);
	const setSelectedMetaMod = modMetaStore(state => state.setSelectedMod);

	const toggleSetPriority = modOrderStore(state => state.toggleSetPriority);
	const setSelectedPriorityMod = modOrderStore(state => state.setSelectedMod);

	const toggleModRemove = modsStore(state => state.toggleModRemove);
	const setSelectedRemoveMod = modsStore(state => state.setSelectedMod);

	const handleOpenModUrl = useCallback(
		async (inSteamClient: boolean = false) => {
			let modUrl = 'url' in mod ? mod.url : undefined;
			const itemType = 'item_type' in mod ? mod.item_type : 'separator';
			if (!modUrl && itemType === 'steam_mod') {
				modUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.identifier}`;
				if (inSteamClient) {
					await api.open_external_url(`steam://openurl/${modUrl}`);
					return;
				}
			}

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
		<ModActionRenderer
			isModSeparator={false}
			mod={mod}
			selectedGame={selectedGame}
			handleOpenModUrl={handleOpenModUrl}
			handleMetaInfo={handleMetaInfo}
			handleRemove={handleRemove}
			handleSetPriority={handleSetPriority}
			deleteText={deleteText}
			showExternalLink={showExternalLink}
		/>
	);
};

export const ModActionDropdownRenderer = ({
	isModSeparator,
	mod,
	handleMetaInfo,
	handleOpenModUrl,
	selectedGame,
	showExternalLink,
	handleSetPriority,
	handleRemove,
	deleteText,

	cellStyle,
	handleEdit,
	handleDelete,
}: {
	isModSeparator: boolean;
	mod: ModItemSeparatorUnion;
	handleMetaInfo?: () => void;
	handleOpenModUrl?: (inBrowser: boolean) => void;
	handleSetPriority?: () => void;
	handleRemove?: () => void;
	deleteText?: string;
	selectedGame?: IGameMeta;
	showExternalLink?: boolean;

	cellStyle?: {
		backgroundColor?: string;
		color?: string;
	};
	handleEdit?: () => void;
	handleDelete?: () => void;
}) => {
	if (isModSeparator) {
		return (
			<TableCell className="w-[40px]" style={cellStyle}>
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
								Edit (Meta Information)
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
	}

	if (
		typeof handleOpenModUrl === 'undefined' ||
		typeof showExternalLink === 'undefined'
	)
		return null;
	const currentMod = mod as ModItem;

	return (
		<TableCell className="w-[40px]">
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
							Edit (Meta Information)
						</DropdownMenuItem>

						<DropdownMenuItem
							className="text-xs py-2 my-0"
							onClick={() =>
								api.highlight_path(currentMod.mod_file_path)
							}
						>
							<EyeIcon className="w-3 h-3" />
							Open Mod Location
						</DropdownMenuItem>

						{showExternalLink && (
							<DropdownMenuItem
								className="text-xs py-2 my-0"
								onClick={() => handleOpenModUrl(false)}
							>
								<LinkIcon className="w-3 h-3" />
								Open Mod Page in Browser
							</DropdownMenuItem>
						)}

						{currentMod.item_type === 'steam_mod' && (
							<DropdownMenuItem
								className="text-xs py-2 my-0"
								onClick={() => handleOpenModUrl(true)}
							>
								<EyeIcon className="w-3 h-3" />
								Open Mod Page in Steam Client
							</DropdownMenuItem>
						)}

						{currentMod.item_type === 'steam_mod' &&
							typeof currentMod.creator_id === 'string' &&
							currentMod.creator_id !== null && (
								<DropdownMenuItem
									className="text-xs py-2 my-0"
									onClick={() =>
										api.open_external_url(
											`steam://openurl/https://steamcommunity.com/profiles/${
												currentMod.creator_id
											}/myworkshopfiles/?appid=${
												selectedGame!.steam_id
											}`,
										)
									}
								>
									<UserIcon className="w-3 h-3" />
									More from this Author
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

export const ModActionContextMenuRenderer = ({
	isModSeparator,
	mod,
	handleMetaInfo,
	handleOpenModUrl,
	selectedGame,
	showExternalLink,
	handleSetPriority,
	handleRemove,
	deleteText,
	handleEdit,
	handleDelete,
}: {
	isModSeparator: boolean;
	mod: ModItemSeparatorUnion;
	handleMetaInfo?: () => void;
	handleOpenModUrl?: (inBrowser: boolean) => void;
	handleSetPriority?: () => void;
	handleRemove?: () => void;
	deleteText?: string;
	selectedGame?: IGameMeta;
	showExternalLink?: boolean;
	handleEdit?: () => void;
	handleDelete?: () => void;
}) => {
	// Handle mod separator case
	if (isModSeparator) {
		return (
			<ContextMenuGroup>
				<ContextMenuLabel>{mod.title}</ContextMenuLabel>
				<ContextMenuSeparator />
				<ContextMenuItem onSelect={handleEdit}>
					<InfoIcon className="w-3 h-3 mr-2" />
					Edit (Meta Information)
				</ContextMenuItem>
				<ContextMenuItem onSelect={handleDelete}>
					<TrashIcon className="w-3 h-3 mr-2 text-red-500" />
					Delete
				</ContextMenuItem>
			</ContextMenuGroup>
		);
	}

	if (
		typeof handleOpenModUrl === 'undefined' ||
		typeof showExternalLink === 'undefined'
	)
		return null;

	const currentMod = mod as ModItem;

	return (
		<ContextMenuGroup>
			<ContextMenuLabel>{mod.title}</ContextMenuLabel>
			<ContextMenuSeparator />
			<ContextMenuItem onSelect={handleMetaInfo}>
				<InfoIcon className="w-3 h-3 mr-2" />
				Edit (Meta Information)
			</ContextMenuItem>

			<ContextMenuItem
				onSelect={() => api.highlight_path(currentMod.mod_file_path)}
			>
				<EyeIcon className="w-3 h-3 mr-2" />
				Open Mod Location
			</ContextMenuItem>

			{showExternalLink && (
				<ContextMenuItem onSelect={() => handleOpenModUrl(false)}>
					<LinkIcon className="w-3 h-3 mr-2" />
					Open Mod Page in Browser
				</ContextMenuItem>
			)}

			{currentMod.item_type === 'steam_mod' && (
				<>
					<ContextMenuItem onSelect={() => handleOpenModUrl(true)}>
						<EyeIcon className="w-3 h-3 mr-2" />
						Open Mod Page in Steam Client
					</ContextMenuItem>

					{typeof currentMod.creator_id === 'string' &&
						currentMod.creator_id !== null && (
							<ContextMenuItem
								onSelect={() =>
									api.open_external_url(
										`steam://openurl/https://steamcommunity.com/profiles/${
											currentMod.creator_id
										}/myworkshopfiles/?appid=${
											selectedGame!.steam_id
										}`,
									)
								}
							>
								<UserIcon className="w-3 h-3 mr-2" />
								More from this Author
							</ContextMenuItem>
						)}
				</>
			)}

			<ContextMenuItem onSelect={handleSetPriority}>
				<ArrowRightIcon className="w-3 h-3 mr-2" />
				Set Priority
			</ContextMenuItem>

			<ContextMenuItem onSelect={handleRemove}>
				<TrashIcon className="w-3 h-3 mr-2 text-red-500" />
				{deleteText}
			</ContextMenuItem>
		</ContextMenuGroup>
	);
};
