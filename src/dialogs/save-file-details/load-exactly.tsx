import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';

import { modsStore } from '@/lib/store/mods';
import { saveFilesStore } from '@/lib/store/save_files';

import { startGame } from '@/sidebar/play';

import { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

export const LoadExactly = () => {
	const setIsGameLoading = settingStore(state => state.setIsGameLoading);
	const selectedGame = settingStore(state => state.selectedGame);

	const setSaveFileDialogOpen = saveFilesStore(
		state => state.setSaveFileDialogOpen,
	);
	const selectedSaveFile = saveFilesStore(state => state.selectedSaveFile);
	const setCurrentlyRunningMods = saveFilesStore(
		state => state.setCurrentlyRunningMods,
	);

	const mods = modsStore(state => state.mods);
	const missingMods = selectedSaveFile
		? selectedSaveFile.load_order_data.filter(
				lr =>
					!mods.some(m => m.identifier === lr.identifier) &&
					lr.is_active === true &&
					lr.pack_file !== null, // Ignore separators
			)
		: [];

	const handleLoadExactly = async () => {
		if (!selectedSaveFile || !selectedSaveFile.load_order_data) return;

		try {
			setIsGameLoading(true);
			setCurrentlyRunningMods(
				selectedSaveFile.load_order_data.map(m => {
					if (m.pack_file === null) {
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
							pack_file: m.pack_file,
							pack_file_path: m.pack_file_path,
							is_active: m.is_active,
							order_index: m.order_index,
						};
					}
				}),
			);

			const modsFromSave = selectedSaveFile.load_order_data
				.filter(lrf => lrf.is_active && lrf.pack_file !== null)
				.sort((a, b) => a.order_index - b.order_index)
				.map(lr => {
					const findMod = mods.find(
						m => (m as ModItem).pack_file === lr.pack_file,
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
			await startGame(
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
