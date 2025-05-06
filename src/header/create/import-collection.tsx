import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { Compact as ColorPicker } from '@uiw/react-color';
import { ExternalLinkIcon, XIcon, UndoIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import api, { SteamCollection, WorkshopItem } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modSeparatorStore } from '@/lib/store/mod_separator';
import {
	formatFileSizeSI,
	isValidURL,
	normalizeOrder,
	toastError,
} from '@/lib/utils';

export const ImportCollection = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [collectionFetchLoading, setCollectionFetchLoading] = useState(false);
	const [steamURL, setSteamURL] = useState('');
	const [collection, setCollection] = useState<SteamCollection>();

	const [useSeparator, setUseSeparator] = useState(false);
	const [separatorTitle, setSeparatorTitle] = useState<string>();
	const [backgroundColor, setBackgroundColor] = useState('#262626');
	const [textColor, setTextColor] = useState('#fefefe');
	const [moveExistingModsUnderSeparator, setMoveExistingModsUnderSeparator] =
		useState(false);

	const [ignoredMods, setIgnoredMods] = useState<Set<number>>(new Set());

	const selectedGame = settingStore(state => state.selectedGame);

	const mods = modsStore(state => state.mods);

	const { modOrderData, setModOrderData } = modOrderStore(
		useShallow(state => ({
			modOrderData: state.data,
			setModOrderData: state.setData,
		})),
	);

	const { separators, setSeparators } = modSeparatorStore(
		useShallow(state => ({
			separators: state.data,
			setSeparators: state.setData,
		})),
	);

	const isFormValid = useMemo(
		() => typeof collection !== 'undefined' && collection?.items.length > 0,
		[collection],
	);

	const alreadyExistingIds = useMemo(
		() =>
			typeof collection !== 'undefined' && collection?.items.length > 0
				? collection?.items
						.filter(mod =>
							mods.some(
								m =>
									m.identifier ===
									String(mod.published_file_id),
							),
						)
						.map(m => m.published_file_id)
				: [],
		[collection, mods],
	);

	const activeMods = useMemo(
		() =>
			collection?.items.filter(
				mod =>
					!ignoredMods.has(mod.published_file_id) &&
					alreadyExistingIds.indexOf(mod.published_file_id) === -1,
			) || [],
		[collection, ignoredMods, alreadyExistingIds],
	);

	const handleFetch = async () => {
		if (!isValidURL(steamURL)) {
			toast.error('Invalid URL');
			return;
		}

		setCollectionFetchLoading(true);
		try {
			setCollection(undefined);
			const url = new URL(steamURL);
			const params = new URLSearchParams(url.search);
			const collection = await api.get_collection_items(
				selectedGame!.steam_id,
				Number(params.get('id')),
			);
			if (collection.items.length === 0) {
				toast.error('No mods found in this collection');
				return;
			}

			setCollection(collection);
		} catch (error) {
			toastError(error);
		} finally {
			setCollectionFetchLoading(false);
		}
	};

	const handleSubmit = async () => {
		if (typeof collection === 'undefined') return;

		setIsLoading(true);
		try {
			let newModOrderData = [...modOrderData];
			const highestOrder = Math.max(
				...newModOrderData.map(m => m.order),
				0,
			);
			let nextOrder = highestOrder;

			const separatorName = separatorTitle || collection.details.title;
			if (useSeparator && separatorName) {
				if (separators.some(s => s.title === separatorName.trim())) {
					throw new Error(
						'A separator with this name already exists',
					);
				}

				const uniqueId = uuidv4();
				const separatorId = `separator_${uniqueId}`;
				const newSeparator = {
					identifier: separatorId,
					title: separatorName,
					order: nextOrder + 1,
					background_color: backgroundColor,
					text_color: textColor,
					collapsed: false,
				};

				setSeparators([...separators, newSeparator]);
				nextOrder++;

				newModOrderData.push({
					mod_id: separatorId,
					order: nextOrder,
					title: separatorName,
				});
			}

			if (moveExistingModsUnderSeparator && useSeparator) {
				const existingMods = newModOrderData.filter(mod =>
					alreadyExistingIds.some(
						id =>
							mods.find(m => m.identifier === String(id))
								?.identifier === mod.mod_id,
					),
				);

				newModOrderData = newModOrderData.filter(
					mod => !existingMods.some(em => em.mod_id === mod.mod_id),
				);

				existingMods.forEach(mod => {
					nextOrder++;
					newModOrderData.push({
						...mod,
						order: nextOrder,
					});
				});
			}

			for (const mod of activeMods) {
				await api.subscribe(
					selectedGame!.steam_id,
					mod.published_file_id,
				);

				nextOrder++;
				newModOrderData.push({
					mod_id: String(mod.published_file_id),
					order: nextOrder,
					title: mod.title,
				});
			}

			newModOrderData = normalizeOrder(newModOrderData);
			setModOrderData(newModOrderData);
			toast.info('Collection imported successfully');

			await checkDownloadsUntilComplete(activeMods);
		} catch (error) {
			toastError(error);
		} finally {
			setIsLoading(false);
		}
	};

	async function checkDownloadsUntilComplete(activeMods: WorkshopItem[]) {
		const interval = 5000;

		const checkAll = async () => {
			let allComplete = true;

			for (let index = 0; index < activeMods.length; index++) {
				const mod = activeMods[index];
				const download_state = await api.check_item_download(
					selectedGame!.steam_id,
					mod.published_file_id,
				);
				if (!download_state.download_complete) {
					allComplete = false;
				}
			}

			return allComplete;
		};

		const poll = async () => {
			const allDone = await checkAll();

			if (allDone) {
				toast.success('Download complete.');
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				setTimeout(poll, interval);
			}
		};

		poll();
	}

	const toggleModIgnore = (modId: number) => {
		setIgnoredMods(prev => {
			const newSet = new Set(prev);
			if (newSet.has(modId)) {
				newSet.delete(modId);
			} else {
				newSet.add(modId);
			}
			return newSet;
		});
	};

	return (
		<div className="flex size-full flex-col justify-between px-2 pt-2">
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3">
					<Label className="text-blue-500">Steam URL</Label>
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-3">
							<Input
								autoComplete="off"
								autoCorrect="off"
								className="grow"
								placeholder="eg. https://steamcommunity.com/sharedfiles/filedetails/?id=123456789"
								value={steamURL}
								onChange={e =>
									setSteamURL(e.currentTarget.value)
								}
							/>

							<Button
								variant="info-outline"
								type="button"
								disabled={isLoading || collectionFetchLoading}
								className={
									isLoading || collectionFetchLoading
										? 'disabled'
										: ''
								}
								onClick={handleFetch}
							>
								Fetch
								{collectionFetchLoading && <Loading />}
							</Button>
						</div>

						{isFormValid && (
							<>
								<div className="mt-3 flex items-center justify-between gap-2">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="useSeparator"
											checked={useSeparator}
											onCheckedChange={isChecked =>
												setUseSeparator(
													isChecked as any,
												)
											}
										/>
										<label
											htmlFor="useSeparator"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Use dedicated separator
										</label>
									</div>
									{typeof collection !== 'undefined' &&
										collection.items.length > 0 && (
											<div className="flex items-center gap-4 text-sm">
												<div className="size-3 bg-green-500" />
												<div>
													Mods that already exist.
												</div>
											</div>
										)}
								</div>

								{useSeparator && (
									<>
										<div className="grid grid-cols-4 items-center gap-3">
											<Label>Separator Title</Label>
											<Input
												autoComplete="off"
												autoCorrect="off"
												className="col-span-3"
												placeholder="Separator Title"
												style={{
													backgroundColor,
													color: textColor,
												}}
												defaultValue={
													separatorTitle ||
													(typeof collection !==
													'undefined'
														? collection.details
																.title
														: undefined)
												}
												onChange={e =>
													setSeparatorTitle(
														e.currentTarget.value,
													)
												}
											/>
										</div>
										<div className="grid grid-cols-5 items-center gap-3">
											<Label className="col-span-2 flex flex-col gap-3">
												<span>Background Color</span>
												<em>{backgroundColor}</em>
											</Label>
											<div className="col-span-3">
												<ColorPicker
													className="!w-full grow"
													color={backgroundColor}
													onChange={color =>
														setBackgroundColor(
															color.hex,
														)
													}
												/>
											</div>
										</div>
										<div className="grid grid-cols-5 items-center gap-3">
											<Label className="col-span-2 flex flex-col gap-3">
												<span>Text Color</span>
												<em>{textColor}</em>
											</Label>
											<div className="col-span-3">
												<ColorPicker
													className="!w-full grow"
													color={textColor}
													onChange={color =>
														setTextColor(color.hex)
													}
												/>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="moveExistingModsUnderSeparator"
												className="border-orange-500 data-[state=checked]:bg-orange-500"
												checked={
													moveExistingModsUnderSeparator
												}
												onCheckedChange={isChecked =>
													setMoveExistingModsUnderSeparator(
														isChecked as any,
													)
												}
											/>
											<label
												htmlFor="moveExistingModsUnderSeparator"
												className="text-sm font-medium italic leading-none text-orange-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
											>
												Move existing mods under
												separator
											</label>
										</div>
									</>
								)}
							</>
						)}
					</div>
				</div>
				<div className="flex flex-col divide-y">
					{collection?.items.map(mod => (
						<div
							className={`flex items-center divide-x p-1 text-sm transition-opacity hover:bg-secondary-bg ${
								ignoredMods.has(mod.published_file_id)
									? 'opacity-40'
									: ''
							}`}
							key={`mod_to_import_${mod.published_file_id}`}
						>
							<div className="flex w-full items-center justify-between gap-2">
								<div className="flex flex-1 items-center justify-between">
									<div
										className={`flex items-center gap-2 truncate hover:cursor-pointer hover:text-sky-500 ${
											alreadyExistingIds.indexOf(
												mod.published_file_id,
											) !== -1
												? 'text-green-500'
												: ''
										}`}
										onClick={() =>
											api.open_external_url(
												`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.published_file_id}`,
											)
										}
									>
										<img
											src={mod.preview_url}
											className="size-5 rounded-md"
										/>
										{mod.title}
										<ExternalLinkIcon className="size-3" />
									</div>
									<div className="whitespace-nowrap text-xs italic text-muted-foreground">
										{formatFileSizeSI(mod.file_size)}
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="size-6"
									onClick={() =>
										toggleModIgnore(mod.published_file_id)
									}
								>
									{ignoredMods.has(mod.published_file_id) ? (
										<UndoIcon className="size-4" />
									) : (
										<XIcon className="size-4" />
									)}
								</Button>
							</div>
						</div>
					))}
				</div>
				<div className="mb-3 flex justify-between px-1">
					<span className="text-sm font-medium leading-none text-muted-foreground">
						{estimateTotalSize(
							collection?.items.filter(
								item =>
									!ignoredMods.has(item.published_file_id),
							),
						)}
					</span>
					<span className="text-sm font-medium leading-none text-muted-foreground">
						{typeof collection !== 'undefined'
							? collection?.items.length - ignoredMods.size
							: 0}{' '}
						active / {ignoredMods.size} ignored
					</span>
				</div>
			</div>
			<Button
				type="button"
				variant="info"
				disabled={!isFormValid || isLoading}
				className={!isFormValid || isLoading ? 'disabled' : ''}
				onClick={handleSubmit}
			>
				Subscribe & Import
				{isLoading && <Loading />}
			</Button>
		</div>
	);
};

const estimateTotalSize = (items?: { file_size: number }[]): string => {
	if (!items || items.length === 0) return 'No items';

	const assumedMinForUnknown = 2 * 1024 * 1024 * 1024; // 2 GB in bytes

	let knownTotal = 0;
	let zeroCount = 0;

	for (const item of items) {
		if (item.file_size === 0) {
			zeroCount++;
		} else {
			knownTotal += item.file_size;
		}
	}

	const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const format = (bytes: number): string => {
		const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1000));
		const size = (bytes / Math.pow(1000, sizeIndex)).toFixed(2);
		return `${size} ${units[sizeIndex]}`;
	};

	if (zeroCount === 0) {
		return `Total: ${format(knownTotal)}`;
	} else {
		const minTotal = knownTotal + zeroCount * assumedMinForUnknown;
		const maxTotal = knownTotal + zeroCount * (2.5 * 1024 * 1024 * 1024);
		return `Total: ${format(minTotal)} - ${format(maxTotal)}`;
	}
};
