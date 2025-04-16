import { lazy, Suspense, useEffect, useState, useCallback } from 'react';

import { appConfigDir } from '@tauri-apps/api/path';

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/sonner';
import { Loading } from '@/components/loading';

import api from '@/lib/api';
import { dbWrapper } from '@/lib/db';
import { SettingModel, settingStore } from '@/lib/store/setting';

const App = lazy(() => import('./app'));
const GameSelector = lazy(() => import('./game-selector'));

const toasterOptions = {
	classNames: {
		success: 'text-green-500',
		error: 'text-red-500',
		info: 'text-blue-500',
	},
};

function AppInit() {
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
	const setColumnSelection = settingStore(state => state.setColumnSelection);
	const setSortBy = settingStore(state => state.setSortBy);
	const setSortByDirection = settingStore(state => state.setSortByDirection);
	const setPreviewSize = settingStore(state => state.setPreviewSize);

	const setIncludeHiddenDownloads = settingStore(
		state => state.setIncludeHiddenDownloads,
	);
	const setCompactArchiveNames = settingStore(
		state => state.setCompactArchiveNames,
	);
	const setSidebarAccordion = settingStore(
		state => state.setSidebarAccordion,
	);

	const init = useCallback(async () => {
		setInitLoading(true);
		await dbWrapper.initialize();
		const steamLibraryPaths = await api.steam_library_paths();
		setSteamLibraryPaths(steamLibraryPaths);
		const supportedGames = await api.supported_games();
		setGames(supportedGames, steamLibraryPaths);

		const setting = await SettingModel.retrieve();
		setColumnSelection('type', setting.column_selections.type);
		setColumnSelection('category', setting.column_selections.category);
		setColumnSelection('conflict', setting.column_selections.conflict);
		setColumnSelection('version', setting.column_selections.version);
		setColumnSelection('creator', setting.column_selections.creator);
		setColumnSelection('created_at', setting.column_selections.created_at);
		setColumnSelection('updated_at', setting.column_selections.updated_at);
		setSortBy(setting.sort_by);
		setSortByDirection(setting.sort_by_direction);
		setPreviewSize(setting.preview_size);
		setIncludeHiddenDownloads(setting.include_hidden_downloads);
		setCompactArchiveNames(setting.compact_archive_names);
		setSidebarAccordion(setting.sidebar_accordion);
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
	}, [init]);

	if (initLoading) return <Loading />;

	if (!selectedGame)
		return (
			<Suspense fallback={<Loading />}>
				<GameSelector />
			</Suspense>
		);

	return (
		<ErrorBoundary>
			<Toaster theme="dark" toastOptions={toasterOptions} />
			<Suspense fallback={<Loading />}>
				<App />
			</Suspense>
		</ErrorBoundary>
	);
}

export default AppInit;
