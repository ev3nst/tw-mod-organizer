import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArchiveIcon, PauseIcon, PlayIcon, XIcon } from 'lucide-react';

import { listen } from '@tauri-apps/api/event';

import { Button } from '@/components/button';

import api, { NexusDownloadLinkRequest } from '@/lib/api';
import { SettingModel, settingStore } from '@/lib/store/setting';
import DownloadManager, { DownloadRecord } from '@/lib/store/download-manager';
import { modsStore } from '@/lib/store/mods';
import { formatFileSize, toastError } from '@/lib/utils';

type DownloadProgRecord = DownloadRecord & { progress?: number };

export const Downloads = () => {
	const [data, setData] = useState<DownloadProgRecord[]>([]);
	const [isPaused, setIsPaused] = useState<boolean>(false);

	const games = settingStore(state => state.games);
	const selectedGame = settingStore(state => state.selectedGame);
	const mod_download_path = settingStore(state => state.mod_download_path);

	const setModFilePath = modsStore(state => state.setModFilePath);
	const setModFileMeta = modsStore(state => state.setModFileMeta);
	const setInstallModItemOpen = modsStore(
		state => state.setInstallModItemOpen,
	);

	useEffect(() => {
		const initializeDownloads = async () => {
			if (games.length === 0) return;

			const downloadManager = DownloadManager.getInstance();
			try {
				const initialDownloads = await downloadManager.retrieve();
				const processedDownloads = initialDownloads.map(d => ({
					...d,
					progress:
						d.total_size > 0
							? (d.bytes_downloaded / d.total_size) * 100
							: 0,
				}));

				setData(processedDownloads);
				setIsPaused(
					initialDownloads.some(
						download => download.status !== 'completed',
					),
				);
			} catch (error) {
				toastError(error);
			}
		};

		initializeDownloads();
	}, [games]);

	useEffect(() => {
		const dm = DownloadManager.getInstance();
		let lastUpdateTime = Date.now();

		const throttleInterval = 500;
		dm.onProgress(payload => {
			const { download_id, bytes_downloaded, total_size } = payload;
			const currentTime = Date.now();
			if (currentTime - lastUpdateTime >= throttleInterval) {
				setData(prevData =>
					prevData.map(download =>
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
		});
	}, []);

	useEffect(() => {
		const setupNXMProtocolListener = async () => {
			if (games.length === 0) return;

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

						const downFindGame = games.find(
							g =>
								g.nexus_slug ===
								requestOptions.game_domain_name,
						);
						if (!downFindGame) {
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
						setData(prev => [
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

			return () => unlisten();
		};

		const cleanup = setupNXMProtocolListener();
		return () => {
			cleanup.then((fn: any) => fn());
		};
	}, [games, selectedGame]);

	useEffect(() => {
		const setupDownloadComplete = async () => {
			const unlisten = await listen<string>(
				'download-complete',
				async event => {
					const { download_id } = event.payload as any;
					setData(prevData =>
						prevData.map(download =>
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

		const cleanup = setupDownloadComplete();
		return () => {
			cleanup.then((fn: any) => fn());
		};
	});

	const handlePauseResume = async () => {
		const downloadManager = DownloadManager.getInstance();
		try {
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
		const downloadManager = DownloadManager.getInstance();
		try {
			for (const download of data) {
				await downloadManager.remove(download.id);
			}
			setData([]);
		} catch (error) {
			toastError(error);
		}
	};

	const renderPauseResume = () => {
		if (!data.some(d => d.status !== 'completed')) return null;

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

	return (
		<div>
			{data.length > 0 ? (
				<div className="flex items-center gap-1 px-3">
					<div className="me-3 border-b pb-1">Bulk Action:</div>
					{renderPauseResume()}
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
			{data.map(dItem => (
				<div
					key={`downloads_${dItem.app_id}_${dItem.item_id}`}
					className="flex items-start p-3 hover:cursor-pointer hover:bg-black/90 relative"
				>
					<div className="flex items-center gap-3">
						<div className="text-xs leading-5">
							<div
								className="hover:cursor-pointer hover:text-blue-500 pe-[50px]"
								onClick={() => {
									if (
										typeof dItem.progress !== 'undefined' &&
										dItem.progress !== 100
									) {
										return;
									}

									const modFilePath = `${mod_download_path}\\${dItem.filename}`;
									setModFilePath(modFilePath);
									setModFileMeta({
										mod_file_path: modFilePath,
										mod_url: dItem?.mod_url,
										preview_url: dItem?.preview_url,
										version: dItem?.version,
									});
									setInstallModItemOpen(true);
								}}
							>
								{dItem.filename}
							</div>
							<div className="flex justify-between text-muted-foreground">
								<div>
									{typeof dItem.progress !== 'undefined' &&
									dItem.progress !== 100
										? `${dItem.progress.toFixed(2)}%`
										: formatFileSize(dItem.total_size)}
								</div>
								<div>
									{new Date(
										dItem.created_at as any,
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
						onClick={async () => {
							const setting = await SettingModel.retrieve();
							const downloadFilePath = `${setting.mod_download_path}\\${dItem.filename}`;
							api.highlight_path(downloadFilePath);
						}}
					>
						<ArchiveIcon />
					</Button>
					<Button
						className="hover:text-red-500 h-6 w-6 absolute right-3 top-2 [&_svg]:size-3"
						variant="ghost"
						size="icon"
						onClick={async () => {
							const downloadManager =
								DownloadManager.getInstance();
							await downloadManager.remove(dItem.id);
							setData(data.filter(f => f.id !== dItem.id));
						}}
					>
						<XIcon />
					</Button>
				</div>
			))}
		</div>
	);
};
