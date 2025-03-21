import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';
import { startGame } from '@/sidebar/play';

import { settingStore } from '@/lib/store/setting';
import { saveFilesStore } from '@/lib/store/save_files';
import { modsStore } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';
import { isSeparator } from '@/lib/store/mod_separator';

import type { ModItem } from '@/lib/store/mods';
import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';
import { toastError } from '@/lib/utils';

export const Play = () => {
	const setIsGameLoading = settingStore(state => state.setIsGameLoading);
	const selectedGame = settingStore(state => state.selectedGame);

	const setSaveFileDialogOpen = saveFilesStore(
		state => state.setSaveFileDialogOpen,
	);
	const selectedSaveFile = saveFilesStore(state => state.selectedSaveFile);
	const setCurrentlyRunningMods = saveFilesStore(
		state => state.setCurrentlyRunningMods,
	);

	const modActivationData = modActivationStore(state => state.data);
	const mods = modsStore(state => state.mods);

	const missingMods = selectedSaveFile
		? selectedSaveFile.load_order_data.filter(
				lr =>
					!mods.some(m => m.identifier === lr.identifier) &&
					lr.is_active === true &&
					lr.pack_file !== null, // Ignore separators
			)
		: [];

	const handlePlay = async () => {
		if (!selectedSaveFile || !selectedSaveFile.load_order_data) return;

		try {
			setIsGameLoading(true);
			const orderMap: Record<string, number> =
				selectedSaveFile.load_order_data.reduce(
					(acc: any, item: any) => {
						acc[item.identifier] = item.order_index;
						return acc;
					},
					{} as Record<string, number>,
				);
			const sortedMods = [...mods].sort((a, b) => {
				return orderMap[a.identifier] - orderMap[b.identifier];
			});

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
							pack_file: mod.pack_file,
							pack_file_path: mod.pack_file_path,
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

			const modsFromSave = sortedMods
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
				.map(m => {
					const mod = m as ModItem;
					const findMod = mods.find(
						m => (m as ModItem).pack_file === mod.pack_file,
					) as ModItem;
					if (!findMod) {
						console.error(mod);
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
					onClick={handlePlay}
				>
					Play
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>
					It will load the save with required mods and its order. If
					there are new active mods they will also be loaded.
				</p>
			</TooltipContent>
		</Tooltip>
	);
};
