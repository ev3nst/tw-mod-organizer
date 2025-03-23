import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';

import { dbWrapper } from '@/lib/db';
import { NexusDownloadResponse } from '@/lib/api';
import { SettingModel } from '@/lib/store/setting';

export interface DownloadRecord {
	id: number;
	app_id: number;
	item_id: number;
	filename: string;
	url: string;
	total_size: number;
	bytes_downloaded: number;
	mod_url?: string | null;
	preview_url?: string | null;
	version?: string | null;
	progress?: number;
	status: 'queued' | 'in_progress' | 'paused' | 'completed' | 'error';
	hidden: 0 | 1;
	created_at?: number;
	updated_at?: number;
}

interface DownloadState {
	downloads: DownloadRecord[];
	isPaused: boolean;
	isProcessing: boolean;
	isLoading: boolean;
	nxmProtocolLoading: boolean;

	loadDownloads: (app_id: number, includeHidden: 0 | 1) => Promise<void>;
	addDownload: (
		app_id: number,
		item_id: number,
		filename: string,
		nexus_result: NexusDownloadResponse,
	) => Promise<number>;
	pauseDownload: () => Promise<void>;
	resumeDownload: () => Promise<void>;
	removeDownload: (downloadId: number) => Promise<void>;
	toggleHidden: (downloadId: number) => Promise<void>;
	setNxmProtocolLoading: (isLoading: boolean) => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
	downloads: [],
	isPaused: false,
	isProcessing: false,
	isLoading: false,
	nxmProtocolLoading: false,

	loadDownloads: async (app_id, includeHidden) => {
		try {
			set({ isLoading: true });

			const query =
				includeHidden === 1
					? 'SELECT * FROM downloads WHERE app_id = ? ORDER BY id DESC'
					: 'SELECT * FROM downloads WHERE app_id = ? AND hidden = 0 ORDER BY id DESC';

			const results: DownloadRecord[] = await dbWrapper.db.select(query, [
				app_id,
			]);

			const setting = await SettingModel.retrieve();
			const syncRequests = results
				.filter(record => record.status !== 'completed')
				.map(record => ({
					filename: record.filename,
					download_path: `${setting.mod_download_path}\\${app_id}`,
					expected_bytes_downloaded: record.bytes_downloaded,
					total_size: record.total_size,
				}));

			if (syncRequests.length > 0) {
				const syncResults: {
					filename: string;
					actual_bytes_downloaded: number;
					status: string;
				}[] = await invoke('sync_downloads', {
					downloads: syncRequests,
				});

				for (const syncResult of syncResults) {
					await dbWrapper.db.execute(
						'UPDATE downloads SET bytes_downloaded = ?, status = ? WHERE filename = ?',
						[
							syncResult.actual_bytes_downloaded,
							syncResult.status,
							syncResult.filename,
						],
					);
				}

				for (const result of results) {
					const syncResult = syncResults.find(
						r => r.filename === result.filename,
					);
					if (syncResult) {
						result.bytes_downloaded =
							syncResult.actual_bytes_downloaded;
						result.status = syncResult.status as any;
					}
				}
			}

			const processedDownloads = results.map(download => ({
				...download,
				progress:
					download.total_size > 0
						? (download.bytes_downloaded / download.total_size) *
							100
						: 0,
			}));

			set({
				downloads: processedDownloads,
				isPaused: results.some(
					download => download.status !== 'completed',
				),
				isLoading: false,
			});
		} catch (error) {
			console.error('Error loading downloads:', error);
			toast.error('Failed to load downloads');
			set({ isLoading: false });
		}
	},

	addDownload: async (app_id, item_id, filename, nexus_result) => {
		try {
			await dbWrapper.db.execute(
				'DELETE FROM downloads WHERE filename = ? AND status = "error"',
				[filename],
			);

			const checkIfExists: DownloadRecord[] = await dbWrapper.db.select(
				'SELECT * FROM downloads WHERE app_id = ? AND item_id = ?',
				[app_id, item_id],
			);

			if (checkIfExists && checkIfExists.length > 0) {
				throw new Error('This file is already in download list.');
			}

			const query = `
			INSERT INTO downloads 
			(app_id, item_id, filename, url, total_size, bytes_downloaded, preview_url, version, mod_url, status, hidden) 
			VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'queued', 0)
			`;

			const result = await dbWrapper.db.execute(query, [
				app_id,
				item_id,
				filename,
				nexus_result.download_url,
				nexus_result.file_size,
				nexus_result.preview_url,
				nexus_result.version,
				nexus_result.mod_url,
			]);

			if (!result.lastInsertId) {
				throw new Error('Could not add item to downloads database.');
			}

			const now = Date.now();
			const newDownload: DownloadRecord = {
				id: result.lastInsertId,
				app_id,
				item_id,
				filename,
				url: nexus_result.download_url,
				total_size: nexus_result.file_size,
				bytes_downloaded: 0,
				preview_url: nexus_result.preview_url,
				version: nexus_result.version,
				mod_url: nexus_result.mod_url,
				status: 'queued',
				hidden: 0,
				progress: 0,
				created_at: now,
			};

			set(state => ({
				downloads: [newDownload, ...state.downloads],
			}));

			if (!get().isProcessing) {
				get().resumeDownload();
			}

			return result.lastInsertId;
		} catch (error) {
			console.error('Error adding download:', error);
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Failed to add download');
			}
			throw error;
		}
	},

	pauseDownload: async () => {
		try {
			await invoke('pause_download');
			set({ isPaused: true, isProcessing: false });
		} catch (error) {
			console.error('Error pausing download:', error);
			toast.error('Failed to pause download');
		}
	},

	resumeDownload: async () => {
		try {
			set({ isProcessing: true, isPaused: false });

			const query =
				'SELECT * FROM downloads WHERE status = "queued" OR status = "in_progress" OR status = "paused" ORDER BY id LIMIT 1';
			const results: DownloadRecord[] = await dbWrapper.db.select(query);

			if (results.length === 0) {
				set({ isProcessing: false });
				return;
			}

			const download = results[0];

			await dbWrapper.db.execute(
				'UPDATE downloads SET status = "in_progress" WHERE id = ?',
				[download.id],
			);

			const setting = await SettingModel.retrieve();
			await invoke('start_download', {
				task: {
					id: download.id,
					url: download.url,
					filename: download.filename,
					total_size: download.total_size,
					bytes_downloaded: download.bytes_downloaded,
					status: 'in_progress',
					download_path: `${setting.mod_download_path}\\${setting.selected_game}`,
				},
			});

			set(state => ({
				downloads: state.downloads.map(d =>
					d.id === download.id ? { ...d, status: 'in_progress' } : d,
				),
			}));
		} catch (error) {
			console.error('Error resuming download:', error);
			toast.error('Failed to resume download');
			set({ isProcessing: false });
		}
	},

	removeDownload: async downloadId => {
		try {
			const downloadRecord: DownloadRecord[] = await dbWrapper.db.select(
				'SELECT * FROM downloads WHERE id = ?',
				[downloadId],
			);

			if (!downloadRecord || downloadRecord.length === 0) {
				throw new Error('Download record could not be found.');
			}

			const setting = await SettingModel.retrieve();
			await invoke('remove_download', {
				download_path: `${setting.mod_download_path}\\${setting.selected_game}`,
				filename: downloadRecord[0].filename,
			});

			await dbWrapper.db.execute('DELETE FROM downloads WHERE id = ?', [
				downloadId,
			]);

			set(state => ({
				downloads: state.downloads.filter(d => d.id !== downloadId),
			}));
		} catch (error) {
			console.error('Error removing download:', error);
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Failed to remove download');
			}
		}
	},

	toggleHidden: async downloadId => {
		try {
			const downloadRecord: DownloadRecord[] = await dbWrapper.db.select(
				'SELECT * FROM downloads WHERE id = ?',
				[downloadId],
			);

			if (!downloadRecord || downloadRecord.length === 0) {
				throw new Error('Download record could not be found.');
			}

			const newHiddenValue = downloadRecord[0].hidden === 1 ? 0 : 1;

			await dbWrapper.db.execute(
				'UPDATE downloads SET hidden = ? WHERE id = ?',
				[newHiddenValue, downloadId],
			);

			set(state => ({
				downloads: state.downloads.map(d =>
					d.id === downloadId
						? { ...d, hidden: newHiddenValue as 0 | 1 }
						: d,
				),
			}));
		} catch (error) {
			console.error('Error toggling hidden state:', error);
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Failed to update download visibility');
			}
		}
	},

	setNxmProtocolLoading: isLoading => {
		set({ nxmProtocolLoading: isLoading });
	},
}));

export const setupDownloadListeners = async () => {
	listen<{
		download_id: number;
		bytes_downloaded: number;
		total_size: number;
	}>('download-progress', async event => {
		const { download_id, bytes_downloaded, total_size } = event.payload;

		const store = useDownloadStore.getState();
		const currentTime = Date.now();
		const download = store.downloads.find(d => d.id === download_id);

		if (
			!download ||
			!download.updated_at ||
			currentTime - download.updated_at > 250
		) {
			await dbWrapper.db.execute(
				'UPDATE downloads SET bytes_downloaded = ?, status = ? WHERE id = ?',
				[
					bytes_downloaded,
					bytes_downloaded === total_size
						? 'completed'
						: 'in_progress',
					download_id,
				],
			);

			useDownloadStore.setState(state => ({
				downloads: state.downloads.map(d =>
					d.id === download_id
						? {
								...d,
								bytes_downloaded,
								progress:
									total_size > 0
										? (bytes_downloaded / total_size) * 100
										: 0,
								status:
									bytes_downloaded === total_size
										? 'completed'
										: 'in_progress',
								lastUpdate: currentTime,
							}
						: d,
				),
			}));
		}
	});

	listen<{ download_id: number }>('download-complete', async event => {
		const { download_id } = event.payload;

		await dbWrapper.db.execute(
			'UPDATE downloads SET status = "completed" WHERE id = ?',
			[download_id],
		);

		useDownloadStore.setState(state => ({
			downloads: state.downloads.map(d =>
				d.id === download_id
					? {
							...d,
							status: 'completed',
							progress: 100,
						}
					: d,
			),
		}));

		const store = useDownloadStore.getState();
		if (store.isProcessing) {
			store.resumeDownload();
		}
	});

	listen<string>('nxm-protocol', async event => {
		const store = useDownloadStore.getState();
		store.setNxmProtocolLoading(true);

		try {
			const processNxmProtocol = async () => {
				const downloadRequestLink = event.payload;
				const downloadLinkExp = downloadRequestLink.split('/');

				if (downloadLinkExp?.length !== 7) {
					throw new Error('Invalid download link');
				}

				const searchParams = new URL(downloadRequestLink).searchParams;
				const requestOptions = {
					game_domain_name: downloadLinkExp[2],
					file_id: Number(downloadLinkExp[6].split('?')[0]),
					mod_id: Number(downloadLinkExp[4]),
					download_key: searchParams.get('key')!,
					download_expires: Number(searchParams.get('expires')),
				};

				if (
					!requestOptions.game_domain_name ||
					isNaN(requestOptions.file_id) ||
					isNaN(requestOptions.mod_id) ||
					!requestOptions.download_key ||
					isNaN(requestOptions.download_expires)
				) {
					throw new Error('App could not parse given download link.');
				}

				const settingStore = await import('@/lib/store/setting');
				const { games, selectedGame } =
					settingStore.settingStore.getState();

				const targetGame = games.find(
					g => g.nexus_slug === requestOptions.game_domain_name,
				);

				if (!targetGame) {
					throw new Error('Unsupported game.');
				}

				if (targetGame.steam_id !== selectedGame?.steam_id) {
					throw new Error(
						`This file is for another game, you should switch to ${targetGame.name} for downloads to work.`,
					);
				}

				const api = await import('@/lib/api');
				const nxmLinkResponse =
					await api.default.nexus_download_link(requestOptions);

				const url = new URL(nxmLinkResponse.download_url);
				const fileName = decodeURIComponent(
					url.pathname.split('/').pop()!,
				);

				await store.addDownload(
					selectedGame.steam_id,
					requestOptions.file_id,
					fileName,
					nxmLinkResponse,
				);
			};

			await processNxmProtocol();
		} catch (error) {
			console.error('NXM protocol error:', error);
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Failed to process download link');
			}
		} finally {
			store.setNxmProtocolLoading(false);
		}
	});
};
