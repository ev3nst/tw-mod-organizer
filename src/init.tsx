import { useEffect, useState, useCallback } from 'react';

import { appConfigDir } from '@tauri-apps/api/path';

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/sonner';
import { Loading } from '@/components/loading';

import { dbWrapper } from '@/lib/db';
import { SettingModel, settingStore } from '@/lib/store/setting';
import api from '@/lib/api';

import GameSelector from './game-selector';
import App from './app';

function Init() {
	const [initLoading, setInitLoading] = useState(true);

	const setGames = settingStore(state => state.setGames);
	const setSelectedGame = settingStore(state => state.setSelectedGame);
	const selectedGame = settingStore(state => state.selectedGame);
	const setSteamLibraryPaths = settingStore(
		state => state.setSteamLibraryPaths,
	);
	const setModDownloadPath = settingStore(state => state.setModDownloadPath);
	const setModInstallationPath = settingStore(
		state => state.setModInstallationPath,
	);
	const setNexusAuthApi = settingStore(state => state.setNexusAuthApi);
	const setNexusAuthParams = settingStore(state => state.setNexusAuthParams);
	const setCategory = settingStore(state => state.setCategory);
	const setConflict = settingStore(state => state.setConflict);
	const setVersion = settingStore(state => state.setVersion);

	const init = useCallback(async () => {
		setInitLoading(true);
		await dbWrapper.initialize();
		const steamLibraryPaths = await api.steam_library_paths();
		setSteamLibraryPaths(steamLibraryPaths);
		const supportedGames = await api.supported_games();
		setGames(supportedGames, steamLibraryPaths);

		const setting = await SettingModel.retrieve();
		setCategory(setting.column_selections.category);
		setConflict(setting.column_selections.conflict);
		setVersion(setting.column_selections.version);
		setNexusAuthApi(setting.nexus_api_key ?? null);
		setNexusAuthParams(
			setting.nexus_auth_params ?? {
				id: null,
				token: null,
			},
		);

		const appConfig = await appConfigDir();
		if (
			typeof setting.mod_download_path !== 'undefined' &&
			setting.mod_download_path !== null
		) {
			setModDownloadPath(setting.mod_download_path);
		} else {
			setModDownloadPath(`${appConfig}\\downloads`);
		}

		if (
			typeof setting.mod_installation_path !== 'undefined' &&
			setting.mod_installation_path !== null
		) {
			setModInstallationPath(setting.mod_installation_path);
		} else {
			setModInstallationPath(`${appConfig}\\mods`);
		}

		const findSelectedGame = supportedGames.find(
			game => game.steam_id === setting.selected_game,
		);
		if (findSelectedGame) {
			setSelectedGame(findSelectedGame);
		}

		setInitLoading(false);
	}, []);

	useEffect(() => {
		init();

		// Prevent CTRL + F from opening the browser search
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey && event.key === 'f') {
				event.preventDefault();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [init]);

	if (initLoading) return <Loading />;

	if (!selectedGame) return <GameSelector />;

	return (
		<ErrorBoundary>
			<Toaster
				theme="dark"
				toastOptions={{
					classNames: {
						success: 'text-green-500',
						error: 'text-red-500',
						info: 'text-blue-500',
					},
				}}
			/>
			<App />
		</ErrorBoundary>
	);
}

export default Init;
