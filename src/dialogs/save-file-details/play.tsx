import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';
import { saveFilesStore } from '@/lib/store/save_files';
import { modsStore } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';
import { isSeparator } from '@/lib/store/mod_separator';

import type { ModItem } from '@/lib/store/mods';
import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';
import {
	startGameBannerlord,
	startGameTotalwar,
	toastError,
} from '@/lib/utils';

export const Play = () => {
	const { setIsGameLoading, selectedGame } = settingStore(
		useShallow(state => ({
			setIsGameLoading: state.setIsGameLoading,
			selectedGame: state.selectedGame,
		})),
	);

	const { setSaveFileDialogOpen, selectedSaveFile, setCurrentlyRunningMods } =
		saveFilesStore(
			useShallow(state => ({
				setSaveFileDialogOpen: state.setSaveFileDialogOpen,
				selectedSaveFile: state.selectedSaveFile,
				setCurrentlyRunningMods: state.setCurrentlyRunningMods,
			})),
		);

	const mods = modsStore(state => state.mods);
	const modActivationData = modActivationStore(state => state.data);

	const [unavailableMods, setUnavailableMods] = useState<string[]>([]);

	const missingMods = useMemo(
		() =>
			selectedSaveFile
				? selectedSaveFile.load_order_data.filter(
						lr =>
							!mods.some(m => m.identifier === lr.identifier) &&
							lr.is_active === true &&
							lr.mod_file !== null, // Ignore separators
					)
				: [],
		[selectedSaveFile, mods],
	);

	const orderMap = useMemo(() => {
		if (!selectedSaveFile?.load_order_data) return {};
		return selectedSaveFile.load_order_data.reduce(
			(acc: Record<string, number>, item: any) => {
				acc[item.identifier] = item.order_index;
				return acc;
			},
			{},
		);
	}, [selectedSaveFile?.load_order_data]);

	const sortedMods = useMemo(
		() =>
			[...mods].sort(
				(a, b) => orderMap[a.identifier] - orderMap[b.identifier],
			),
		[mods, orderMap],
	);

	const modsFromSave = useMemo(() => {
		if (!selectedSaveFile?.load_order_data) return [];

		setUnavailableMods([]);

		const result: ModItemSeparatorUnion[] = [];

		sortedMods
			.filter(ms => {
				if (isSeparator(ms)) return false;
				const saveFileMod = selectedSaveFile.load_order_data.find(
					lr => lr.identifier === ms.identifier,
				);
				const isActive =
					((saveFileMod && saveFileMod.is_active) ||
						modActivationData.find(
							ma => ma.mod_id === ms.identifier,
						)?.is_active) ??
					false;
				return isActive;
			})
			.forEach(m => {
				const mod = m as ModItem;
				const findMod = mods.find(
					m => (m as ModItem).mod_file === mod.mod_file,
				) as ModItem;

				if (!findMod) {
					setUnavailableMods(prev => [...prev, mod.title]);
				} else {
					result.push(findMod);
				}
			});

		return result;
	}, [
		sortedMods,
		selectedSaveFile?.load_order_data,
		modActivationData,
		mods,
	]);

	const hasPlayIssues = missingMods.length > 0 || unavailableMods.length > 0;

	const getTooltipMessage = () => {
		if (missingMods.length > 0 && unavailableMods.length > 0) {
			return 'Some required mods are missing and some previously used mods are no longer available.';
		} else if (missingMods.length > 0) {
			return 'Some required mods are missing from your system.';
		} else if (unavailableMods.length > 0) {
			return `Some previously used mods are no longer available: ${unavailableMods.join(', ')}`;
		}
		return 'It will load the save with required mods and its order. If there are new active mods they will also be loaded.';
	};

	const handlePlay = async () => {
		if (!selectedSaveFile || !selectedSaveFile.load_order_data) return;
		if (hasPlayIssues) return;

		try {
			setIsGameLoading(true);
			setCurrentlyRunningMods(
				sortedMods.map((m, mi) => {
					if (isSeparator(m)) {
						return {
							identifier: m.identifier,
							title: m.title,
							is_active: false,
							order_index: mi + 1,
							background_color: m.background_color,
							text_color: m.text_color,
						};
					} else {
						const mod = m as ModItem;
						const saveFileMod =
							selectedSaveFile.load_order_data.find(
								lr => lr.identifier === mod.identifier,
							);
						return {
							identifier: m.identifier,
							title: m.title,
							mod_file: mod.mod_file,
							mod_file_path: mod.mod_file_path,
							is_active:
								((saveFileMod && saveFileMod.is_active) ||
									modActivationData.find(
										ma => ma.mod_id === mod.identifier,
									)?.is_active) ??
								false,
							order_index: mi + 1,
						};
					}
				}),
			);

			switch (selectedGame!.type) {
				case 'totalwar':
					await startGameTotalwar(
						selectedGame!.steam_id,
						modsFromSave,
						modsFromSave.map(lr => {
							return {
								mod_id: lr.identifier,
								is_active: true,
								title: lr.title,
							};
						}),
						{
							...selectedSaveFile,
							meta_exists: true,
							date: 0,
						},
					);
					break;
				case 'bannerlord':
					await startGameBannerlord(
						selectedGame!.steam_id,
						modsFromSave,
						modsFromSave.map(lr => {
							return {
								mod_id: lr.identifier,
								is_active: true,
								title: lr.title,
							};
						}),
						{
							...selectedSaveFile,
							meta_exists: true,
							date: 0,
						},
					);
					break;
				default:
					throw new Error('Unsupported Game');
			}

			setSaveFileDialogOpen(false);
		} catch (error) {
			toastError(error);
		} finally {
			setTimeout(() => {
				setIsGameLoading(false);
			}, 3000);
		}
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="secondary"
					disabled={hasPlayIssues}
					className={hasPlayIssues ? 'disabled' : ''}
					onClick={handlePlay}
				>
					Play
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>{getTooltipMessage()}</p>
			</TooltipContent>
		</Tooltip>
	);
};
