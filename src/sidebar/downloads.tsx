import { useEffect, useState } from 'react';
import { ArchiveIcon, PauseIcon, PlayIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { listen } from '@tauri-apps/api/event';

import { Button } from '@/components/button';

import api, { NexusDownloadLinkRequest } from '@/lib/api';
import { SettingModel, settingStore } from '@/lib/store/setting';
import DownloadManager, { DownloadRecord } from '@/lib/store/download-manager';
import { modsStore } from '@/lib/store/mods';
import { formatFileSize, toastError } from '@/lib/utils';

type DownloadProgRecord = DownloadRecord & { progress?: number };

export const Downloads = () => {
	const [downloads, setDownloads] = useState<DownloadProgRecord[]>([]);
	const [isPaused, setIsPaused] = useState<boolean>(false);

	const games = settingStore(state => state.games);
	const selectedGame = settingStore(state => state.selectedGame);
	const mod_download_path = settingStore(state => state.mod_download_path);
	const setDownloadedArchivePath = modsStore(
		state => state.setDownloadedArchivePath,
	);
	const setDownloadedModMeta = modsStore(state => state.setDownloadedModMeta);
	const setInstallModItemOpen = modsStore(
		state => state.setInstallModItemOpen,
	);

	useEffect(() => {
		const loadDownloads = async () => {
			try {
				const downloadManager = DownloadManager.getInstance();
				const initialDownloads = await downloadManager.retrieve();

				const processedDownloads = initialDownloads.map(download => ({
					...download,
					progress:
						download.total_size > 0
							? (download.bytes_downloaded /
									download.total_size) *
								100
							: 0,
				}));

				setDownloads(processedDownloads);
				setIsPaused(
					initialDownloads.some(
						download => download.status !== 'completed',
					),
				);
			} catch (error) {
				toastError(error);
			}
		};

		loadDownloads();
	}, []);

	useEffect(() => {
		const downloadManager = DownloadManager.getInstance();
		let lastUpdateTime = Date.now();
		const throttleInterval = 500;

		const progressHandler = (payload: {
			download_id: number;
			bytes_downloaded: number;
			total_size: number;
		}) => {
			const { download_id, bytes_downloaded, total_size } = payload;
			const currentTime = Date.now();

			if (currentTime - lastUpdateTime >= throttleInterval) {
				setDownloads(prevDownloads =>
					prevDownloads.map(download =>
						download.id === download_id
							? {
									...download,
									bytes_downloaded,
									progress:
										download.progress !== undefined
											? total_size > 0
												? (bytes_downloaded /
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
	}, []);

	useEffect(() => {
		const handleNxmProtocol = async () => {
			const unlisten = await listen<string>(
				'nxm-protocol',
				async event => {
					try {
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

						toast.info(
							'Download started: ' + nxmLinkResponse.download_url,
						);

						const now = Date.now();
						setDownloads(prev => [
							...prev,
							{
								id: lastInsertedId,
								app_id: selectedGame!.steam_id,
								item_id: requestOptions.file_id,
								filename: fileName,
								url: nxmLinkResponse.download_url,
								total_size: nxmLinkResponse.file_size,
								bytes_downloaded: 0,
								status: 'in_progress',
								hidden: 0,
								progress: 0,
								created_at: now,
							},
						]);
					} catch (error) {
						toastError(error);
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
			if (!isPaused) {
				await downloadManager.pause();
			} else {
				await downloadManager.resume();
			}
			setIsPaused(!isPaused);
		} catch (error) {
			toastError(error);
		}
	};

	const handleRemoveAll = async () => {
		try {
			const downloadManager = DownloadManager.getInstance();
			for (const download of downloads) {
				await downloadManager.remove(download.id);
			}
			setDownloads([]);
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

	const handleDownloadFileSelection = (download: DownloadProgRecord) => {
		if (
			typeof download.progress !== 'undefined' &&
			download.progress !== 100
		) {
			return;
		}

		const modFilePath = `${mod_download_path}\\${selectedGame!.steam_id}\\${download.filename}`;
		setDownloadedArchivePath(modFilePath);
		setDownloadedModMeta({
			mod_file_path: modFilePath,
			mod_url: download?.mod_url,
			preview_url: download?.preview_url,
			version: download?.version,
		});
		setInstallModItemOpen(true);
	};

	const handleHighlightPath = async (filename: string) => {
		try {
			const setting = await SettingModel.retrieve();
			const downloadFilePath = `${setting.mod_download_path}\\${selectedGame!.steam_id}\\${filename}`;
			api.highlight_path(downloadFilePath);
		} catch (error) {
			toastError(error);
		}
	};

	const renderPauseResumeButton = () => {
		if (!downloads.some(download => download.status !== 'completed'))
			return null;

		return (
			<Button
				className="hover:text-blue-500"
				variant="ghost"
				size="icon"
				onClick={handlePauseResume}
			>
				{isPaused ? <PlayIcon /> : <PauseIcon />}
			</Button>
		);
	};

	const renderDownloadItem = (download: DownloadProgRecord) => (
		<div
			key={`downloads_${download.app_id}_${download.item_id}`}
			className="flex items-start p-3 hover:cursor-pointer hover:bg-black/90 relative"
		>
			<div className="flex items-center gap-3">
				<div className="text-xs leading-5">
					<div
						className="hover:cursor-pointer hover:text-blue-500 pe-[50px]"
						onClick={() => handleDownloadFileSelection(download)}
					>
						{download.filename}
					</div>
					<div className="flex justify-between text-muted-foreground">
						<div>
							{typeof download.progress !== 'undefined' &&
							download.progress !== 100
								? `${download.progress.toFixed(2)}%`
								: formatFileSize(download.total_size)}
						</div>
						<div>
							{new Date(
								download.created_at as any,
							).toLocaleDateString(undefined, {
								hour: 'numeric',
								minute: 'numeric',
							})}
						</div>
					</div>
				</div>
			</div>
			<Button
				className="hover:text-green-500 h-6 w-6 absolute right-10 top-2 [&_svg]:size-3"
				variant="ghost"
				size="icon"
				onClick={() => handleHighlightPath(download.filename)}
			>
				<ArchiveIcon />
			</Button>
			<Button
				className="hover:text-red-500 h-6 w-6 absolute right-3 top-2 [&_svg]:size-3"
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
			{downloads.length > 0 ? (
				<div className="flex items-center gap-1 px-3">
					<div className="me-3 border-b pb-1">Bulk Action:</div>
					{renderPauseResumeButton()}
					<Button
						className="hover:text-red-500"
						variant="ghost"
						size="icon"
						onClick={handleRemoveAll}
					>
						<XIcon />
					</Button>
				</div>
			) : (
				<span className="px-3">No downloaded files at the moment.</span>
			)}
			{downloads.map(renderDownloadItem)}
		</div>
	);
};
