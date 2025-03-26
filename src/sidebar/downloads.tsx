import { useCallback, useEffect, useState } from 'react';
import {
	ArchiveIcon,
	DownloadIcon,
	EyeIcon,
	EyeOffIcon,
	FolderIcon,
	LoaderIcon,
	PauseIcon,
	PlayIcon,
	RemoveFormattingIcon,
	TypeIcon,
	XIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { listen } from '@tauri-apps/api/event';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import api, { NexusDownloadLinkRequest } from '@/lib/api';
import { SettingModel, settingStore } from '@/lib/store/setting';
import DownloadManager, { DownloadRecord } from '@/lib/store/download-manager';
import { modsStore } from '@/lib/store/mods';
import { cleanFileName, formatFileSize, toastError } from '@/lib/utils';

export const Downloads = () => {
	const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
	const [isPaused, setIsPaused] = useState<boolean>(false);
	const [nxmProtocolLoading, setNxmProtocolLoading] =
		useState<boolean>(false);

	const games = settingStore(state => state.games);
	const selectedGame = settingStore(state => state.selectedGame);
	const mod_download_path = settingStore(state => state.mod_download_path);
	const include_hidden_downloads = settingStore(
		state => state.include_hidden_downloads,
	);
	const setIncludeHiddenDownloads = settingStore(
		state => state.setIncludeHiddenDownloads,
	);
	const compact_archive_names = settingStore(
		state => state.compact_archive_names,
	);
	const setCompactArchiveNames = settingStore(
		state => state.setCompactArchiveNames,
	);

	const setDownloadedArchivePath = modsStore(
		state => state.setDownloadedArchivePath,
	);
	const setDownloadedModMeta = modsStore(state => state.setDownloadedModMeta);
	const setInstallModItemOpen = modsStore(
		state => state.setInstallModItemOpen,
	);

	const loadDownloads = useCallback(async () => {
		try {
			const downloadManager = DownloadManager.getInstance();
			const initialDownloads = await downloadManager.retrieve(
				selectedGame!.steam_id,
				include_hidden_downloads,
			);
			const processedDownloads = initialDownloads.map(download => ({
				...download,
				progress:
					download.total_size > 0
						? (download.bytes_downloaded / download.total_size) *
							100
						: 0,
			}));

			setDownloads(processedDownloads);
		} catch (error) {
			toastError(error);
		}
	}, [selectedGame!.steam_id, include_hidden_downloads]);

	useEffect(() => {
		loadDownloads();
		const downloadManager = DownloadManager.getInstance();
		downloadManager.resume();
	}, [loadDownloads]);

	useEffect(() => {
		const downloadManager = DownloadManager.getInstance();
		let lastUpdateTime = Date.now();
		const throttleInterval = 500;

		const progressHandler = (payload: {
			download_id: number;
			bytes_downloaded: number;
			total_size: number;
		}) => {
			if (isPaused === true) {
				setIsPaused(false);
			}
			const { download_id, bytes_downloaded, total_size } = payload;
			const currentTime = Date.now();

			if (currentTime - lastUpdateTime >= throttleInterval) {
				setDownloads([...downloads]);
				setDownloads(
					downloads.map(download =>
						download.id === download_id
							? {
									...download,
									bytes_downloaded:
										download.bytes_downloaded <
										bytes_downloaded
											? bytes_downloaded
											: download.bytes_downloaded,
									progress:
										download.progress !== undefined
											? total_size > 0
												? ((download.bytes_downloaded <
													bytes_downloaded
														? bytes_downloaded
														: download.bytes_downloaded) /
														total_size) *
													100
												: 0
											: download.progress,
								}
							: download,
					),
				);

				lastUpdateTime = currentTime;
			}
		};

		downloadManager.onProgress(progressHandler);
	}, [downloads, isPaused]);

	useEffect(() => {
		const handleNxmProtocol = async () => {
			const unlisten = await listen<string>(
				'nxm-protocol',
				async event => {
					try {
						setNxmProtocolLoading(true);
						const downloadRequestLink = event.payload;
						const downloadLinkExp = downloadRequestLink.split('/');

						if (downloadLinkExp?.length !== 7) {
							toast.error('Invalid download link');
							return;
						}

						const searchParams = new URL(downloadRequestLink)
							.searchParams;
						const requestOptions: NexusDownloadLinkRequest = {
							game_domain_name: downloadLinkExp[2],
							file_id: Number(downloadLinkExp[6].split('?')[0]),
							mod_id: Number(downloadLinkExp[4]),
							download_key: searchParams.get('key')!,
							download_expires: Number(
								searchParams.get('expires'),
							),
						};

						if (
							!requestOptions.game_domain_name ||
							isNaN(requestOptions.file_id) ||
							isNaN(requestOptions.mod_id) ||
							!requestOptions.download_key ||
							isNaN(requestOptions.download_expires)
						) {
							toast.error(
								'App could not parse given download link.',
							);
							console.error(requestOptions);
							return;
						}

						const targetGame = games.find(
							g =>
								g.nexus_slug ===
								requestOptions.game_domain_name,
						);
						if (!targetGame) {
							toast.error('Unsupported game.');
							return;
						}

						if (targetGame.steam_id !== selectedGame!.steam_id) {
							toast.error(
								`This file is for another game, you should switch to ${targetGame.name} for downloads to work.`,
							);
							return;
						}

						const nxmLinkResponse =
							await api.nexus_download_link(requestOptions);
						const url = new URL(nxmLinkResponse.download_url);
						const fileName = decodeURIComponent(
							url.pathname.split('/').pop()!,
						);

						const downloadManager = DownloadManager.getInstance();
						const lastInsertedId = await downloadManager.add(
							selectedGame!.steam_id,
							requestOptions.file_id,
							fileName,
							nxmLinkResponse,
						);

						const now = Date.now();
						setDownloads(prev => {
							const hasActiveDownloads = prev.some(
								d =>
									d.status === 'in_progress' ||
									d.status === 'queued',
							);

							return [
								...prev,
								{
									id: lastInsertedId,
									app_id: selectedGame!.steam_id,
									item_id: requestOptions.file_id,
									filename: fileName,
									url: nxmLinkResponse.download_url,
									total_size: nxmLinkResponse.file_size,
									bytes_downloaded: 0,
									status:
										prev.length === 0 || !hasActiveDownloads
											? 'in_progress'
											: 'queued',
									hidden: 0,
									progress: 0,
									created_at: now,
								},
							];
						});
						setIsPaused(false);
						await downloadManager.resume();
					} catch (error) {
						toastError(error);
					} finally {
						setNxmProtocolLoading(false);
					}
				},
			);

			return unlisten;
		};

		const cleanup = handleNxmProtocol();
		return () => {
			cleanup.then((fn: any) => fn());
		};
	}, [selectedGame!.steam_id]);

	useEffect(() => {
		const handleDownloadComplete = async () => {
			const unlisten = await listen<string>(
				'download-complete',
				async event => {
					const { download_id } = event.payload as any;
					setDownloads(prevDownloads =>
						prevDownloads.map(download =>
							download.id === download_id
								? {
										...download,
										bytes_downloaded: download.total_size,
										progress: undefined,
									}
								: download,
						),
					);

					await loadDownloads();
				},
			);

			return unlisten;
		};

		const cleanup = handleDownloadComplete();
		return () => {
			cleanup.then((fn: any) => fn());
		};
	}, []);

	const handlePauseResume = async () => {
		try {
			const downloadManager = DownloadManager.getInstance();
			if (isPaused) {
				await downloadManager.resume();
				setIsPaused(false);
			} else {
				await downloadManager.pause();
				setIsPaused(true);
			}

			setTimeout(() => {
				loadDownloads();
			}, 500);
		} catch (error) {
			toastError(error);
		}
	};

	const handleRemoveDownload = async (downloadId: number) => {
		try {
			const downloadManager = DownloadManager.getInstance();
			await downloadManager.remove(downloadId);
			setDownloads(
				downloads.filter(download => download.id !== downloadId),
			);
		} catch (error) {
			toastError(error);
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
			const setting = await SettingModel.retrieve();
			const downloadFilePath = `${setting.mod_download_path}\\${
				selectedGame!.steam_id
			}\\${filename}`;
			api.highlight_path(downloadFilePath);
		} catch (error) {
			toastError(error);
		}
	};

	const getStatusBadge = (download: DownloadRecord) => {
		if (download.hidden === 1) return null;

		switch (download.status) {
			case 'queued':
				return <div className="ml-2 text-blue-500 text-xs">Queued</div>;
			case 'in_progress':
				if (isPaused) {
					return (
						<div className="ml-2 text-orange-500 text-xs">
							Paused
						</div>
					);
				}

				return (
					<div className="ml-2 text-green-500 text-xs animate-pulse">
						Active
					</div>
				);
			case 'error':
				return <div className="ml-2 text-red-500 text-xs">Failed</div>;
			default:
				return null;
		}
	};

	const renderDownloadItem = (download: DownloadRecord) => (
		<div
			key={`downloads_${download.app_id}_${download.item_id}`}
			className="p-2 hover:cursor-pointer hover:bg-black/90 relative w-full"
		>
			<div className="text-xs leading-5">
				<div className="flex  justify-between">
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
									{compact_archive_names
										? cleanFileName(download.filename)
										: download.filename}
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem
									onClick={() =>
										handleHighlightPath(download.filename)
									}
								>
									<ArchiveIcon /> Highlight Archive
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										handleDownloadFileSelection(download)
									}
								>
									<DownloadIcon /> Install
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={async () => {
										const downloadManager =
											DownloadManager.getInstance();
										await downloadManager.hideToggle(
											download.id,
										);
										await loadDownloads();
									}}
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
					) : compact_archive_names ? (
						cleanFileName(download.filename)
					) : (
						download.filename
					)}
				</div>

				<div className="flex justify-between text-muted-foreground">
					<div className="flex gap-3">
						<div>
							{download.status === 'in_progress' &&
							typeof download.bytes_downloaded !== 'undefined'
								? `${(
										(download.bytes_downloaded /
											download.total_size) *
										100
									).toFixed(0)}% - ${formatFileSize(
										download.bytes_downloaded,
									)} of ${formatFileSize(download.total_size)}`
								: formatFileSize(download.total_size)}
						</div>

						{getStatusBadge(download)}
					</div>

					<div>
						{download.created_at
							? new Date(download.created_at).toLocaleDateString(
									undefined,
									{
										hour: 'numeric',
										minute: 'numeric',
									},
								)
							: ''}
					</div>
				</div>
				{download.status === 'in_progress' &&
					typeof download.progress !== 'undefined' && (
						<div className="w-full mt-1 bg-gray-700 rounded-full h-1.5">
							<div
								className="bg-blue-600 h-1.5 rounded-full"
								style={{
									width: `${Math.min(
										100,
										download.progress,
									)}%`,
								}}
							></div>
						</div>
					)}
			</div>
			<Button
				className="hover:text-red-500 h-6 w-6 absolute right-3 top-1 [&_svg]:size-3"
				variant="ghost"
				size="icon"
				onClick={() => handleRemoveDownload(download.id)}
			>
				<XIcon />
			</Button>
		</div>
	);

	return (
		<div>
			<div className="absolute top-[5px] left-[110px] z-10 flex items-center gap-2">
				{downloads.length > 0 && (
					<Button
						className="hover:text-blue-500 h-7 w-7"
						variant="ghost"
						size="icon"
						onClick={handlePauseResume}
					>
						{isPaused ? <PlayIcon /> : <PauseIcon />}
					</Button>
				)}

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
						>
							{include_hidden_downloads ? (
								<EyeIcon />
							) : (
								<EyeOffIcon />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Toggle hidden downloads</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="hover:text-blue-500 h-7 w-7"
							variant="ghost"
							size="icon"
							onClick={() =>
								setCompactArchiveNames(
									compact_archive_names === 0 ? 1 : 0,
								)
							}
						>
							{compact_archive_names ? (
								<RemoveFormattingIcon />
							) : (
								<TypeIcon />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Compact archive names</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="hover:text-blue-500 h-7 w-7"
							variant="ghost"
							size="icon"
							onClick={() =>
								api.highlight_path(
									`${mod_download_path}\\${
										selectedGame!.steam_id
									}`,
								)
							}
						>
							<FolderIcon />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Open Downloads Folder</p>
					</TooltipContent>
				</Tooltip>

				{nxmProtocolLoading && (
					<div className="text-center animate-pulse">
						<LoaderIcon className="animate-spin w-5 h-5 text-foreground mx-auto" />
					</div>
				)}
			</div>
			<div className="divide-y w-full">
				{downloads.map(renderDownloadItem)}
			</div>

			{downloads.length === 0 && (
				<div className="text-center p-4 text-muted-foreground">
					No downloaded files found
				</div>
			)}
		</div>
	);
};
