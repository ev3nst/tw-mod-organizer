import { useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SquareXIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { SidebarFooter } from '@/components/sidebar';
import { RippleButton } from '@/components/ripple-button';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogAction,
} from '@/components/alert-dialog';
import { Loading } from '@/components/loading';

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

export const Play = () => {
	const {
		setSaveFileDialogOpen,
		setSelectedSaveFile,
		setCurrentlyRunningMods,
	} = saveFilesStore(
		useShallow(state => ({
			setSaveFileDialogOpen: state.setSaveFileDialogOpen,
			setSelectedSaveFile: state.setSelectedSaveFile,
			setCurrentlyRunningMods: state.setCurrentlyRunningMods,
		})),
	);

	const {
		isGameLoading,
		setIsGameLoading,
		isGameRunning,
		shouldLockScreen,
		setIsGameRunning,
		selectedGame,
	} = settingStore(
		useShallow(state => ({
			isGameLoading: state.isGameLoading,
			setIsGameLoading: state.setIsGameLoading,
			isGameRunning: state.isGameRunning,
			shouldLockScreen: state.shouldLockScreen,
			setIsGameRunning: state.setIsGameRunning,
			selectedGame: state.selectedGame,
		})),
	);

	const mods = modsStore(state => state.mods);
	const modOrderData = modOrderStore(state => state.data);

	const { saveFile, modActivationData } = modActivationStore(
		useShallow(state => ({
			saveFile: state.saveFile,
			modActivationData: state.data,
		})),
	);

	const checkIfGameIsRunning = useCallback(async () => {
		try {
			const result = await api.is_game_running(selectedGame!.steam_id);
			if (isGameRunning !== result) {
				setIsGameRunning(result);
			}
		} catch (error) {
			console.error('Failed to check if the game is running:', error);
		}
	}, [selectedGame?.steam_id, isGameRunning]);

	useEffect(() => {
		const interval = setInterval(checkIfGameIsRunning, 5000);
		checkIfGameIsRunning();
		return () => clearInterval(interval);
	}, [checkIfGameIsRunning]);

	const saveGameCompatibilityCheck =
		useCallback(async (): Promise<boolean> => {
			if (!saveFile?.path || !saveFile.path.includes('\\')) {
				return true;
			}

			const save_game = saveFile.path.split('\\').pop();
			let save_meta_data: any;

			try {
				save_meta_data = await api.fetch_save_file_meta(
					selectedGame!.steam_id,
					save_game as string,
				);
			} catch (_e) {
				toast.warning(
					'Save meta file could not be found, therefore compatibility check failed.',
				);
				return true;
			}

			if (!save_meta_data) return true;

			const isIncompatible = save_meta_data.mod_order_data.some(
				(saveModData: any) => {
					if (saveModData.mod_file === null) return false;

					const mod = mods.find(
						m => m.identifier === saveModData.identifier,
					);
					const modOrder = modOrderData.find(
						mr => mr.mod_id === saveModData.identifier,
					);
					const modActive = modActivationData.find(
						ma => ma.mod_id === saveModData.identifier,
					);

					return (
						!mod ||
						modOrder?.order !== saveModData.order_index ||
						modActive?.is_active !== saveModData.is_active
					);
				},
			);

			if (isIncompatible) {
				setSelectedSaveFile({
					filename: saveFile.filename,
					filesize: saveFile.filesize,
					path: saveFile.path,
					load_order_data: save_meta_data.mod_order_data,
				});
				setSaveFileDialogOpen(true);
				return false;
			}

			return true;
		}, [
			saveFile,
			selectedGame?.steam_id,
			mods,
			modOrderData,
			modActivationData,
		]);

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
			}
		} catch (error) {
			toastError(error);
		} finally {
			setTimeout(() => {
				setIsGameLoading(false);
			}, 5000);
		}
	};

	const playButtonText = useMemo(() => {
		if (isGameRunning) return 'Running';
		if (saveFile?.path) return 'Continue';
		return 'Play';
	}, [isGameRunning, saveFile?.path]);

	return (
		<SidebarFooter className="sticky bottom-0 z-10 mt-auto bg-background py-2">
			<div className="flex items-center justify-between gap-2">
				<RippleButton
					className={`grow bg-gradient-to-r px-6 py-3 font-medium text-white transition-all duration-100 ease-in-out hover:from-green-500 hover:to-emerald-600 hover:shadow-[0_0_10px_rgba(16,185,129,0.8)] ${
						isGameRunning || shouldLockScreen || isGameLoading
							? 'disabled'
							: ''
					} ${
						saveFile && saveFile?.path !== ''
							? 'from-orange-500 to-red-600'
							: 'from-blue-500 to-indigo-600'
					}`}
					onClick={handlePlay}
					disabled={
						isGameRunning || shouldLockScreen || isGameLoading
					}
				>
					{playButtonText}
					{isGameLoading && <Loading />}
				</RippleButton>
				{isGameRunning && (
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button size="icon" variant="destructive">
								<SquareXIcon />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Force Quit</AlertDialogTitle>
								<AlertDialogDescription>
									This action will force quit the game. Are
									you sure you want to do this?
									<span className="mt-2 block text-orange-500">
										This should only be used as a last
										resort if mod organizer stuck as
										"Running". You can also do this with
										task manager and manually stop the
										game's exe process.
									</span>
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									className="bg-red-500 text-white hover:bg-red-700"
									onClick={() =>
										api.force_quit(selectedGame!.steam_id)
									}
								>
									Force Quit
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}
			</div>
		</SidebarFooter>
	);
};
