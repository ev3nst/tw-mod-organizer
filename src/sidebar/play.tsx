import { useEffect } from 'react';

import { SidebarFooter } from '@/components/sidebar';
import { RippleButton } from '@/components/ripple-button';
import { Loading } from '@/components/loading';

import { invoke } from '@tauri-apps/api/core';

import { settingStore } from '@/lib/store/setting';
import { modsStore, type ModItem } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';
import { modOrderStore } from '@/lib/store/mod_order';
import { isSeparator } from '@/lib/store/mod_separator';
import { saveFilesStore } from '@/lib/store/save_files';

import api from '@/lib/api';
import {
	startGameBannerlord,
	startGameTotalwar,
	toastError,
} from '@/lib/utils';
import { toast } from 'sonner';

export const Play = () => {
	const setSaveFileDialogOpen = saveFilesStore(
		state => state.setSaveFileDialogOpen,
	);
	const setSelectedSaveFile = saveFilesStore(
		state => state.setSelectedSaveFile,
	);

	const isGameLoading = settingStore(state => state.isGameLoading);
	const setIsGameLoading = settingStore(state => state.setIsGameLoading);
	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);
	const setIsGameRunning = settingStore(state => state.setIsGameRunning);
	const selectedGame = settingStore(state => state.selectedGame);

	const mods = modsStore(state => state.mods);
	const modOrderData = modOrderStore(state => state.data);
	const saveFile = modActivationStore(state => state.saveFile);
	const modActivationData = modActivationStore(state => state.data);
	const setCurrentlyRunningMods = saveFilesStore(
		state => state.setCurrentlyRunningMods,
	);

	useEffect(() => {
		const checkIfGameIsRunning = async () => {
			try {
				const result: boolean = await invoke('is_game_running', {
					app_id: selectedGame!.steam_id,
				});
				if (isGameRunning !== result) {
					setIsGameRunning(result);
				}
			} catch (error) {
				console.error('Failed to check if the game is running:', error);
			}
		};

		const interval = setInterval(() => checkIfGameIsRunning(), 5000);
		checkIfGameIsRunning();

		return () => clearInterval(interval);
	}, [isGameRunning]);

	const saveGameCompatibilityCheck = async (): Promise<boolean> => {
		let save_game: string | undefined = '';
		if (
			typeof saveFile?.path !== 'undefined' &&
			saveFile?.path !== null &&
			saveFile?.path !== '' &&
			saveFile?.path.includes('\\')
		) {
			save_game = saveFile.path.split('\\').pop() as string;
			let save_meta_data: any;
			try {
				save_meta_data = await api.fetch_save_file_meta(
					selectedGame!.steam_id,
					save_game,
				);
			} catch (_e) {}
			if (!save_meta_data) {
				toast.warning(
					'Save meta file could not be found, therefore compatibility check failed.',
				);
				return true;
			}

			for (
				let smi = 0;
				smi < save_meta_data.mod_order_data.length;
				smi++
			) {
				if (save_meta_data.mod_order_data[smi].mod_file === null)
					continue;

				const mod = mods.find(
					m =>
						m.identifier ===
						save_meta_data.mod_order_data[smi].identifier,
				);

				const modOrder = modOrderData.find(
					mr =>
						mr.mod_id ===
						save_meta_data.mod_order_data[smi].identifier,
				);

				const modActive = modActivationData.find(
					ma =>
						ma.mod_id ===
						save_meta_data.mod_order_data[smi].identifier,
				);

				if (
					!mod ||
					modOrder?.order !==
						save_meta_data.mod_order_data[smi].order_index ||
					modActive?.is_active !==
						save_meta_data.mod_order_data[smi].is_active
				) {
					setSelectedSaveFile({
						filename: saveFile.filename,
						filesize: saveFile.filesize,
						path: saveFile.path,
						load_order_data: save_meta_data.mod_order_data,
					});
					setSaveFileDialogOpen(true);
					return false;
				}
			}
		}

		return true;
	};

	const handlePlay = async () => {
		try {
			const isCompatible = await saveGameCompatibilityCheck();
			if (!isCompatible) return;

			setIsGameLoading(true);
			const orderMap: Record<string, number> = modOrderData.reduce(
				(acc: any, item: any) => {
					acc[item.mod_id] = item.order;
					return acc;
				},
				{} as Record<string, number>,
			);
			const sortedMods = [...mods].sort((a, b) => {
				return orderMap[a.identifier] - orderMap[b.identifier];
			});
			setCurrentlyRunningMods(
				sortedMods.map(m => {
					if (isSeparator(m)) {
						return {
							identifier: m.identifier,
							title: m.title,
							is_active: false,
							order_index: modOrderData.find(
								r => r.mod_id === m.identifier,
							)!.order,
							background_color: m.background_color,
							text_color: m.text_color,
						};
					} else {
						return {
							identifier: m.identifier,
							title: m.title,
							mod_file: (m as ModItem).mod_file,
							mod_file_path: (m as ModItem).mod_file_path,
							is_active: modActivationData.find(
								r => r.mod_id === m.identifier,
							)!.is_active,
							order_index: modOrderData.find(
								r => r.mod_id === m.identifier,
							)!.order,
						};
					}
				}),
			);

			switch (selectedGame!.type) {
				case 'totalwar':
					await startGameTotalwar(
						selectedGame!.steam_id,
						sortedMods,
						modActivationData,
						saveFile,
					);
					break;
				case 'bannerlord':
					await startGameBannerlord(
						selectedGame!.steam_id,
						sortedMods,
						modActivationData,
						saveFile,
					);
					break;
				default:
					throw new Error('Unsupported Game');
					break;
			}
		} catch (error) {
			toastError(error);
		} finally {
			setTimeout(() => {
				setIsGameLoading(false);
			}, 5000);
		}
	};

	let playButtonText = 'Play';
	if (saveFile && saveFile?.path !== '') playButtonText = 'Continue';
	if (isGameRunning) playButtonText = 'Running';

	return (
		<SidebarFooter className="mt-auto sticky bottom-0 bg-background pt-2 pb-2 z-10">
			<RippleButton
				className={`bg-gradient-to-r px-6 py-3 text-white font-medium transition-all duration-100 ease-in-out hover:from-green-500 hover:to-emerald-600 hover:shadow-[0_0_10px_rgba(16,185,129,0.8)] ${
					isGameRunning || shouldLockScreen || isGameLoading
						? 'disabled'
						: ''
				} ${
					saveFile && saveFile?.path !== ''
						? 'from-orange-500 to-red-600'
						: 'from-blue-500 to-indigo-600'
				}`}
				onClick={handlePlay}
				disabled={isGameRunning || shouldLockScreen || isGameLoading}
			>
				{playButtonText}
				{isGameLoading && <Loading />}
			</RippleButton>
		</SidebarFooter>
	);
};
