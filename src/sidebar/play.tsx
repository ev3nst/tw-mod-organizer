import { useEffect, useState } from 'react';

import { SidebarFooter } from '@/components/sidebar';
import { RippleButton } from '@/components/ripple-button';
import { Loading } from '@/components/loading';

import { invoke } from '@tauri-apps/api/core';

import api, { ModItem } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modsStore } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';
import { toastError } from '@/lib/utils';

export const Play = () => {
	const [loading, setLoading] = useState(false);

	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);
	const setIsGameRunning = settingStore(state => state.setIsGameRunning);
	const selectedGame = settingStore(state => state.selectedGame);

	const mods = modsStore(state => state.mods);

	const saveFilePath = modActivationStore(state => state.saveFilePath);
	const modActivations = modActivationStore(state => state.data);

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
	}, []);

	const handlePlay = async () => {
		setLoading(true);
		try {
			const reverseLoadOrder = [...mods].slice().reverse();
			let addDirectoryTxt = '';
			let usedModsTxt = '';
			for (let ri = 0; ri < reverseLoadOrder.length; ri++) {
				const mod = reverseLoadOrder[ri] as ModItem;
				const item_type =
					'item_type' in mod ? mod.item_type : 'separator';
				if (item_type === 'separator') continue;

				const isActive = modActivations.some(
					a => a.is_active === true && a.mod_id === mod.identifier,
				);
				if (!isActive) continue;

				const cleanedPackPath = mod.pack_file_path.replace(/\\/g, '/');
				const packFileName = cleanedPackPath.split('/').pop();
				const packFolder = cleanedPackPath.replace(
					'/' + packFileName,
					'',
				);
				addDirectoryTxt += `add_working_directory "${packFolder}";\n`;
				usedModsTxt += `mod "${packFileName}";\n`;
			}

			let save_game: string | undefined = '';
			if (
				typeof saveFilePath !== 'undefined' &&
				saveFilePath !== null &&
				saveFilePath !== '' &&
				saveFilePath.includes('\\')
			) {
				save_game = saveFilePath.split('\\').pop();
			}

			await api.start_game(
				selectedGame!.steam_id,
				addDirectoryTxt,
				usedModsTxt,
				save_game,
			);
		} catch (error) {
			toastError(error);
		} finally {
			setTimeout(() => {
				setLoading(false);
			}, 5000);
		}
	};

	let playButtonText = 'Play';
	if (saveFilePath && saveFilePath !== '') playButtonText = 'Continue';
	if (isGameRunning) playButtonText = 'Running';

	return (
		<SidebarFooter className="mt-auto sticky bottom-0 bg-background pt-2 pb-2 z-10">
			<RippleButton
				className={`bg-gradient-to-r px-6 py-3 text-white font-medium transition-all duration-100 ease-in-out hover:from-green-500 hover:to-emerald-600 hover:shadow-[0_0_10px_rgba(16,185,129,0.8)] ${
					isGameRunning || shouldLockScreen || loading
						? 'disabled'
						: ''
				} ${
					saveFilePath && saveFilePath !== ''
						? 'from-orange-500 to-red-600'
						: 'from-blue-500 to-indigo-600'
				}`}
				onClick={handlePlay}
				disabled={isGameRunning || shouldLockScreen || loading}
			>
				{playButtonText}
				{loading && <Loading />}
			</RippleButton>
		</SidebarFooter>
	);
};
