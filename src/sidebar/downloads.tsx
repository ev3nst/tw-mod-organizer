import { useEffect } from 'react';
import {
	ArchiveIcon,
	DownloadIcon,
	EyeIcon,
	EyeOffIcon,
	LoaderIcon,
	PauseIcon,
	PlayIcon,
	XIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import {
	DownloadRecord,
	setupDownloadListeners,
	useDownloadStore,
} from '@/lib/store/download-manager';
import { modsStore } from '@/lib/store/mods';
import { formatFileSize } from '@/lib/utils';

export const Downloads = () => {
	const {
		downloads,
		isPaused,
		isLoading,
		nxmProtocolLoading,
		loadDownloads,
		pauseDownload,
		resumeDownload,
		removeDownload,
		toggleHidden,
	} = useDownloadStore();

	const selectedGame = settingStore(state => state.selectedGame);
	const mod_download_path = settingStore(state => state.mod_download_path);
	const include_hidden_downloads = settingStore(
		state => state.include_hidden_downloads,
	);
	const setIncludeHiddenDownloads = settingStore(
		state => state.setIncludeHiddenDownloads,
	);

	const setDownloadedArchivePath = modsStore(
		state => state.setDownloadedArchivePath,
	);
	const setDownloadedModMeta = modsStore(state => state.setDownloadedModMeta);
	const setInstallModItemOpen = modsStore(
		state => state.setInstallModItemOpen,
	);

	useEffect(() => {
		setupDownloadListeners();
	}, []);

	useEffect(() => {
		if (selectedGame) {
			loadDownloads(selectedGame.steam_id, include_hidden_downloads);
		}
	}, [loadDownloads, selectedGame, include_hidden_downloads]);

	const handlePauseResume = async () => {
		if (isPaused) {
			await resumeDownload();
		} else {
			await pauseDownload();
		}
	};

	const handleDownloadFileSelection = (download: DownloadRecord) => {
		if (
			typeof download.progress !== 'undefined' &&
			download.progress !== 100
		) {
			return;
		}

		const modFilePath = `${mod_download_path}\\${selectedGame!.steam_id}\\${
			download.filename
		}`;

		setDownloadedArchivePath(modFilePath);

		setDownloadedModMeta({
			mod_file_path: modFilePath,
			mod_url: download?.mod_url,
			download_url:
				download.mod_url &&
				download.mod_url.startsWith('https://www.nexusmods.com')
					? `${download.mod_url}?tab=files&file_id=${download.item_id}&nmm=1`
					: '',
			preview_url: download?.preview_url,
			version: download?.version,
		});
		setInstallModItemOpen(true);
	};

	const handleHighlightPath = async (filename: string) => {
		try {
			const downloadFilePath = `${mod_download_path}\\${
				selectedGame!.steam_id
			}\\${filename}`;

			await api.highlight_path(downloadFilePath);
		} catch (error) {
			console.error('Error highlighting path:', error);
			toast.error('Failed to highlight file');
		}
	};

	const renderPauseResumeButton = () => {
		if (!downloads.some(download => download.status !== 'completed')) {
			return null;
		}

		return (
			<Button
				className="hover:text-blue-500 h-7 w-7"
				variant="ghost"
				size="icon"
				onClick={handlePauseResume}
				disabled={isLoading}
			>
				{isPaused ? <PlayIcon /> : <PauseIcon />}
			</Button>
		);
	};

	const renderDownloadItem = (download: DownloadRecord) => (
		<div
			key={`downloads_${download.app_id}_${download.item_id}`}
			className="flex items-start p-3 hover:cursor-pointer hover:bg-black/90 relative"
		>
			<div className="flex items-center gap-3">
				<div className="text-xs leading-5">
					{download.status === 'completed' ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<div
									className={`hover:cursor-pointer hover:text-blue-500 pe-[30px] ${
										download.hidden === 1
											? 'text-orange-500'
											: ''
									}`}
								>
									{download.filename}
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem
									onClick={() =>
										handleHighlightPath(download.filename)
									}
								>
									<ArchiveIcon className="mr-2 w-4 h-4" />{' '}
									Highlight Archive
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										handleDownloadFileSelection(download)
									}
								>
									<DownloadIcon className="mr-2 w-4 h-4" />{' '}
									Install
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => toggleHidden(download.id)}
								>
									{download.hidden === 1 ? (
										<div className="flex gap-2 items-center">
											<EyeIcon className="w-4 h-4" /> Set
											Visible
										</div>
									) : (
										<div className="flex gap-2 items-center">
											<EyeOffIcon className="w-4 h-4" />{' '}
											Hide
										</div>
									)}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<div
							className={
								download.status === 'error'
									? 'text-red-500'
									: ''
							}
						>
							{download.filename}
						</div>
					)}

					<div className="flex justify-between text-muted-foreground">
						<div>
							{download.status === 'in_progress' &&
							typeof download.progress !== 'undefined'
								? `${download.progress.toFixed(2)}%`
								: formatFileSize(download.total_size)}
						</div>
						<div>
							{download.created_at
								? new Date(
										download.created_at,
									).toLocaleDateString(undefined, {
										hour: 'numeric',
										minute: 'numeric',
									})
								: ''}
						</div>
					</div>
				</div>
			</div>
			<Button
				className="hover:text-red-500 h-6 w-6 absolute right-3 top-2 [&_svg]:size-3"
				variant="ghost"
				size="icon"
				onClick={() => removeDownload(download.id)}
				disabled={isLoading}
			>
				<XIcon />
			</Button>
		</div>
	);

	return (
		<div>
			<div className="absolute top-[5px] left-[110px] z-10 flex items-center gap-2">
				{renderPauseResumeButton()}

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="hover:text-blue-500 h-7 w-7"
							variant="ghost"
							size="icon"
							onClick={() =>
								setIncludeHiddenDownloads(
									include_hidden_downloads === 0 ? 1 : 0,
								)
							}
							disabled={isLoading}
						>
							{include_hidden_downloads ? (
								<EyeOffIcon />
							) : (
								<EyeIcon />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Toggle hidden downloads</p>
					</TooltipContent>
				</Tooltip>

				{(isLoading || nxmProtocolLoading) && (
					<div className="text-center animate-pulse">
						<LoaderIcon className="animate-spin w-5 h-5 text-foreground mx-auto" />
					</div>
				)}
			</div>

			<div className="divide-y">
				{downloads.length > 0 ? (
					downloads.map(renderDownloadItem)
				) : (
					<div className="p-3 text-sm text-muted-foreground text-center">
						No downloads available
					</div>
				)}
			</div>
		</div>
	);
};
