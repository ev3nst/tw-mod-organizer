import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
	AppWindowIcon,
	ArrowRightIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	InfoIcon,
	LinkIcon,
	MinusIcon,
	PlusIcon,
	StarIcon,
	TrashIcon,
	UngroupIcon,
	UserIcon,
} from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import {
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
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

import { TABLE_DIMENSIONS } from '@/modlist/utils';

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
	const { init_reload, setInitReload } = settingStore(
		useShallow(state => ({
			init_reload: state.init_reload,
			setInitReload: state.setInitReload,
		})),
	);

	const {
		separators,
		setSeparators,
		setSelectedSeparator,
		toggleEditSeparator,
	} = modSeparatorStore(
		useShallow(state => ({
			separators: state.data,
			setSeparators: state.setData,
			setSelectedSeparator: state.setSelectedSeparator,
			toggleEditSeparator: state.toggleEditSeparator,
		})),
	);

	const { toggleSetPriority, setSelectedPriorityMod } = modOrderStore(
		useShallow(state => ({
			toggleSetPriority: state.toggleSetPriority,
			setSelectedPriorityMod: state.setSelectedMod,
		})),
	);

	const handleSetPriority = useCallback(() => {
		setSelectedPriorityMod(mod);
		toggleSetPriority();
	}, [mod.identifier]);

	const handleDelete = useCallback(() => {
		setSeparators(
			[...separators].filter(fi => fi.identifier !== mod.identifier),
		);
		setInitReload(!init_reload);
	}, [separators, mod.identifier, init_reload]);

	const handleEdit = useCallback(() => {
		setSelectedSeparator(mod);
		toggleEditSeparator();
	}, [mod.identifier]);

	const handleCollapseAll = useCallback(() => {
		const updatedSeparators = separators.map(s => ({
			...s,
			collapsed: true,
		}));
		setSeparators(updatedSeparators);
		setTimeout(() => {
			setInitReload(!init_reload);
		}, 200);
	}, [separators, init_reload]);

	const handleExpandAll = useCallback(() => {
		const updatedSeparators = separators.map(s => ({
			...s,
			collapsed: false,
		}));
		setSeparators(updatedSeparators);
		setTimeout(() => {
			setInitReload(!init_reload);
		}, 200);
	}, [separators, init_reload]);

	return (
		<ModActionRenderer
			isModSeparator={true}
			mod={mod}
			handleEdit={handleEdit}
			handleSetPriority={handleSetPriority}
			handleDelete={handleDelete}
			handleCollapseAll={handleCollapseAll}
			handleExpandAll={handleExpandAll}
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

	const { toggleMetaInfo, setSelectedMetaMod } = modMetaStore(
		useShallow(state => ({
			toggleMetaInfo: state.toggleMetaInfo,
			setSelectedMetaMod: state.setSelectedMod,
		})),
	);

	const { toggleSetPriority, setSelectedPriorityMod, toggleSendToSeparator } =
		modOrderStore(
			useShallow(state => ({
				toggleSetPriority: state.toggleSetPriority,
				setSelectedPriorityMod: state.setSelectedMod,
				toggleSendToSeparator: state.toggleSendToSeparator,
			})),
		);

	const { toggleModRemove, setSelectedRemoveMod } = modsStore(
		useShallow(state => ({
			toggleModRemove: state.toggleModRemove,
			setSelectedRemoveMod: state.setSelectedMod,
		})),
	);

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
		[mod.identifier],
	);

	const handleMetaInfo = useCallback(() => {
		setSelectedMetaMod(mod);
		toggleMetaInfo();
	}, [mod.identifier]);

	const handleSetPriority = useCallback(() => {
		setSelectedPriorityMod(mod);
		toggleSetPriority();
	}, [mod.identifier]);

	const handleSendToSeparator = useCallback(() => {
		setSelectedPriorityMod(mod);
		toggleSendToSeparator();
	}, [mod.identifier]);

	const handleRemove = useCallback(() => {
		setSelectedRemoveMod(mod);
		toggleModRemove();
	}, [mod.identifier]);

	const { showExternalLink, deleteText } = useMemo(
		() => ({
			showExternalLink:
				mod.item_type === 'steam_mod' ||
				(mod.url !== null && mod.url !== ''),
			deleteText:
				mod.item_type === 'steam_mod' ? 'Unsubscribe' : 'Delete',
		}),
		[mod.item_type, mod.url],
	);

	return (
		<ModActionRenderer
			isModSeparator={false}
			mod={mod}
			selectedGame={selectedGame}
			handleOpenModUrl={handleOpenModUrl}
			handleMetaInfo={handleMetaInfo}
			handleRemove={handleRemove}
			handleSetPriority={handleSetPriority}
			handleSendToSeparator={handleSendToSeparator}
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
	handleSendToSeparator,
	handleRemove,
	deleteText,

	cellStyle,
	handleEdit,
	handleDelete,
	handleCollapseAll,
	handleExpandAll,
}: {
	isModSeparator: boolean;
	mod: ModItemSeparatorUnion;
	handleMetaInfo?: () => void;
	handleOpenModUrl?: (inBrowser: boolean) => void;
	handleSetPriority?: () => void;
	handleSendToSeparator?: () => void;
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
	handleCollapseAll?: () => void;
	handleExpandAll?: () => void;
}) => {
	if (isModSeparator) {
		return (
			<div style={{ ...cellStyle, ...TABLE_DIMENSIONS.ACTIONS }}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<div className="flex w-full items-center justify-center p-0">
							<EllipsisVerticalIcon className="size-4" />
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56">
						<DropdownMenuGroup>
							<DropdownMenuItem
								className="my-0 py-2 text-xs"
								onClick={handleEdit}
							>
								<InfoIcon className="size-3" />
								Edit (Meta Information)
							</DropdownMenuItem>
							<DropdownMenuItem
								className="my-0 py-2 text-xs"
								onClick={handleSetPriority}
							>
								<ArrowRightIcon className="size-3" />
								Set Priority
							</DropdownMenuItem>
							<DropdownMenuItem
								className="my-0 py-2 text-xs"
								onClick={handleCollapseAll}
							>
								<PlusIcon className="size-3" />
								Collapse All Separators
							</DropdownMenuItem>
							<DropdownMenuItem
								className="my-0 py-2 text-xs"
								onClick={handleExpandAll}
							>
								<MinusIcon className="size-3" />
								Expand All Separators
							</DropdownMenuItem>
							<DropdownMenuItem
								className="my-0 py-2 text-xs"
								onClick={handleDelete}
							>
								<TrashIcon className="size-3 text-red-500" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	if (
		typeof handleOpenModUrl === 'undefined' ||
		typeof showExternalLink === 'undefined'
	)
		return null;
	const currentMod = mod as ModItem;

	return (
		<div style={TABLE_DIMENSIONS.ACTIONS}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<div className="flex w-full items-center justify-center p-0">
						<EllipsisVerticalIcon className="size-4" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56">
					<DropdownMenuGroup>
						<DropdownMenuItem
							className="my-0 py-2 text-xs"
							onClick={handleMetaInfo}
						>
							<InfoIcon className="size-3" />
							Edit (Meta Information)
						</DropdownMenuItem>

						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<StarIcon className="size-3" />
								Open Mod
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuItem
										className="my-0 py-2 text-xs"
										onClick={() =>
											api.highlight_path(
												currentMod.mod_file_path,
											)
										}
									>
										<EyeIcon className="size-3" />
										Mod Location
									</DropdownMenuItem>

									{showExternalLink && (
										<DropdownMenuItem
											className="my-0 py-2 text-xs"
											onClick={() =>
												handleOpenModUrl(false)
											}
										>
											<LinkIcon className="size-3" />
											Mod Page in Browser
										</DropdownMenuItem>
									)}
									{currentMod.item_type === 'steam_mod' && (
										<DropdownMenuItem
											className="my-0 py-2 text-xs"
											onClick={() =>
												handleOpenModUrl(true)
											}
										>
											<EyeIcon className="size-3" />
											Mod Page in Steam Client
										</DropdownMenuItem>
									)}
									<DropdownMenuItem
										className="my-0 py-2 text-xs"
										onClick={() =>
											api.open_pack_file(
												currentMod.mod_file_path,
											)
										}
									>
										<AppWindowIcon className="size-3" />
										Mod in RPFM
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>

						{currentMod.item_type === 'steam_mod' &&
							typeof currentMod.creator_id === 'string' &&
							currentMod.creator_id !== null && (
								<DropdownMenuItem
									className="my-0 py-2 text-xs"
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
									<UserIcon className="size-3" />
									More from this Author
								</DropdownMenuItem>
							)}

						{currentMod.item_type === 'nexus_mod' &&
							typeof currentMod.creator_id === 'string' &&
							currentMod.creator_id.startsWith(
								'https://www.nexusmods.com',
							) && (
								<DropdownMenuItem
									className="my-0 py-2 text-xs"
									onClick={() =>
										api.open_external_url(
											`${
												currentMod.creator_id as string
											}/mods?gameId=${
												selectedGame!.nexus_id
											}`,
										)
									}
								>
									<UserIcon className="size-3" />
									More from this Author
								</DropdownMenuItem>
							)}

						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<ArrowRightIcon className="size-3" />
								Send Mod to
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuItem
										className="my-0 py-2 text-xs"
										onClick={handleSetPriority}
									>
										<ArrowRightIcon className="size-3" />
										Set Priority
									</DropdownMenuItem>
									<DropdownMenuItem
										className="my-0 py-2 text-xs"
										onClick={handleSendToSeparator}
									>
										<UngroupIcon className="size-3" />
										Send to Separator
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>

						<DropdownMenuItem
							className="my-0 py-2 text-xs"
							onClick={handleRemove}
						>
							<TrashIcon className="size-3 text-red-500" />
							{deleteText}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
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
	handleSendToSeparator,
	handleRemove,
	deleteText,
	handleEdit,
	handleDelete,
	handleCollapseAll,
	handleExpandAll,
}: {
	isModSeparator: boolean;
	mod: ModItemSeparatorUnion;
	handleMetaInfo?: () => void;
	handleOpenModUrl?: (inBrowser: boolean) => void;
	handleSetPriority?: () => void;
	handleSendToSeparator?: () => void;
	handleRemove?: () => void;
	deleteText?: string;
	selectedGame?: IGameMeta;
	showExternalLink?: boolean;
	handleEdit?: () => void;
	handleDelete?: () => void;
	handleCollapseAll?: () => void;
	handleExpandAll?: () => void;
}) => {
	// Handle mod separator case
	if (isModSeparator) {
		return (
			<ContextMenuGroup>
				<ContextMenuLabel className="text-primary">
					{mod.title}
				</ContextMenuLabel>
				<ContextMenuSeparator />
				<ContextMenuItem onSelect={handleEdit}>
					<InfoIcon className="mr-2 size-3" />
					Edit (Meta Information)
				</ContextMenuItem>
				<ContextMenuItem onSelect={handleSetPriority}>
					<ArrowRightIcon className="mr-2 size-3" />
					Set Priority
				</ContextMenuItem>
				<ContextMenuItem onSelect={handleCollapseAll}>
					<PlusIcon className="mr-2 size-3" />
					Collapse All Separators
				</ContextMenuItem>
				<ContextMenuItem onSelect={handleExpandAll}>
					<MinusIcon className="mr-2 size-3" />
					Expand All Separators
				</ContextMenuItem>
				<ContextMenuItem onSelect={handleDelete}>
					<TrashIcon className="mr-2 size-3 text-red-500" />
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
			<ContextMenuLabel className="text-primary">
				{mod.title}
			</ContextMenuLabel>
			<ContextMenuSeparator />
			<ContextMenuItem onSelect={handleMetaInfo}>
				<InfoIcon className="mr-2 size-3" />
				Edit (Meta Information)
			</ContextMenuItem>

			<ContextMenuSub>
				<ContextMenuSubTrigger>
					<StarIcon className="mr-2 size-3" />
					Open Mod
				</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuItem
						onSelect={() =>
							api.highlight_path(currentMod.mod_file_path)
						}
					>
						<EyeIcon className="mr-2 size-3" />
						Mod Location
					</ContextMenuItem>
					{showExternalLink && (
						<ContextMenuItem
							onSelect={() => handleOpenModUrl(false)}
						>
							<LinkIcon className="mr-2 size-3" />
							Mod Page in Browser
						</ContextMenuItem>
					)}

					{currentMod.item_type === 'steam_mod' && (
						<ContextMenuItem
							onSelect={() => handleOpenModUrl(true)}
						>
							<EyeIcon className="mr-2 size-3" />
							Mod Page in Steam Client
						</ContextMenuItem>
					)}

					<ContextMenuItem
						onSelect={() =>
							api.open_pack_file(currentMod.mod_file_path)
						}
					>
						<AppWindowIcon className="mr-2 size-3" />
						Mod in RPFM
					</ContextMenuItem>
				</ContextMenuSubContent>
			</ContextMenuSub>

			{currentMod.item_type === 'steam_mod' &&
				typeof currentMod.creator_id === 'string' &&
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
						<UserIcon className="mr-2 size-3" />
						More from this Author
					</ContextMenuItem>
				)}

			<ContextMenuSub>
				<ContextMenuSubTrigger>
					<ArrowRightIcon className="mr-2 size-3" />
					Send Mod to
				</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuItem onSelect={handleSetPriority}>
						<ArrowRightIcon className="mr-2 size-3" />
						Set Priority
					</ContextMenuItem>

					<ContextMenuItem onSelect={handleSendToSeparator}>
						<UngroupIcon className="mr-2 size-3" />
						Send to Separator
					</ContextMenuItem>
				</ContextMenuSubContent>
			</ContextMenuSub>

			<ContextMenuItem onSelect={handleRemove}>
				<TrashIcon className="mr-2 size-3 text-red-500" />
				{deleteText}
			</ContextMenuItem>
		</ContextMenuGroup>
	);
};
