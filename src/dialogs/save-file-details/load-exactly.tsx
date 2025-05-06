import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';

import { modsStore } from '@/lib/store/mods';
import { saveFilesStore } from '@/lib/store/save_files';

import { settingStore } from '@/lib/store/setting';
import type { ModItem } from '@/lib/store/mods';
import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';
import {
	startGameBannerlord,
	startGameTotalwar,
	toastError,
} from '@/lib/utils';

export const LoadExactly = () => {
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

	const modsFromSave = useMemo(() => {
		if (!selectedSaveFile?.load_order_data) return [];
		return selectedSaveFile.load_order_data
			.filter(lrf => lrf.is_active && lrf.mod_file !== null)
			.sort((a, b) => a.order_index - b.order_index)
			.map(lr => {
				const findMod = mods.find(
					m => (m as ModItem).mod_file === lr.mod_file,
				) as ModItem;
				if (!findMod) {
					console.error(lr);
					console.error(mods);
					throw new Error(
						'There was an error while setting up required mod list for this save.',
					);
				}
				return findMod;
			}) as ModItemSeparatorUnion[];
	}, [selectedSaveFile?.load_order_data, mods]);

	const handleLoadExactly = async () => {
		if (!selectedSaveFile || !selectedSaveFile.load_order_data) return;

		try {
			setIsGameLoading(true);
			setCurrentlyRunningMods(
				selectedSaveFile.load_order_data.map(m => {
					if (m.mod_file === null) {
						return {
							identifier: m.identifier,
							title: m.title,
							is_active: false,
							order_index: m.order_index,
							background_color: m.background_color,
							text_color: m.text_color,
						};
					} else {
						return {
							identifier: m.identifier,
							title: m.title,
							mod_file: m.mod_file,
							mod_file_path: m.mod_file_path,
							is_active: m.is_active,
							order_index: m.order_index,
						};
					}
				}),
			);

			switch (selectedGame!.type) {
				case 'totalwar':
					await startGameTotalwar(
						selectedGame!.steam_id,
						modsFromSave,
						selectedSaveFile.load_order_data.map(lr => {
							return {
								mod_id: lr.identifier,
								is_active: lr.is_active,
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
						selectedSaveFile.load_order_data.map(lr => {
							return {
								mod_id: lr.identifier,
								is_active: lr.is_active,
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
					disabled={missingMods?.length > 0}
					className={missingMods?.length > 0 ? 'disabled' : ''}
					onClick={handleLoadExactly}
				>
					Load Exactly
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>
					This action will load the save with required mods and its
					order, ignoring any new active mods.
				</p>
			</TooltipContent>
		</Tooltip>
	);
};
