import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

import { dbWrapper } from '@/lib/db';
import { NexusDownloadResponse } from '@/lib/api';
import { SettingModel } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

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
	status: 'queued' | 'in_progress' | 'error' | 'completed';
	hidden: 1 | 0;
	created_at?: number;
}

interface ProgressCallback {
	(payload: {
		download_id: number;
		bytes_downloaded: number;
		total_size: number;
	}): void;
}

class DownloadManager {
	private static instance: DownloadManager;
	private isProcessing: boolean = false;
	private progressCallback?: ProgressCallback;
	private unlistenDownloadProgress?: UnlistenFn;

	private constructor() {
		this.setupDownloadProgressListener();
		this.setupInitialState();
	}

	private async setupInitialState() {
		try {
			const setting = await SettingModel.retrieve();
			const pendingDownloads = await this.getPendingDownloads(
				setting.selected_game as number,
			);

			if (pendingDownloads.length > 0) {
				await this.resume();
			}
		} catch (error) {
			toastError(error);
		}
	}

	private async getPendingDownloads(
		app_id: number,
	): Promise<DownloadRecord[]> {
		const query = `
            SELECT * FROM downloads 
            WHERE app_id = ? AND status IN ('queued', 'in_progress') 
            ORDER BY id
        `;
		return await dbWrapper.db.select(query, [app_id]);
	}

	public static getInstance(): DownloadManager {
		if (!DownloadManager.instance) {
			DownloadManager.instance = new DownloadManager();
		}
		return DownloadManager.instance;
	}

	public async retrieve(
		app_id: number,
		includeHidden: 1 | 0 = 0,
	): Promise<DownloadRecord[]> {
		const query =
			includeHidden === 1
				? 'SELECT * FROM downloads WHERE app_id = ? ORDER BY id'
				: 'SELECT * FROM downloads WHERE app_id = ? AND hidden = 0 ORDER BY id';

		const results: any = await dbWrapper.db.select(query, [app_id]);

		const setting = await SettingModel.retrieve();
		const syncRequests = results
			.filter((record: DownloadRecord) => record.status !== 'completed')
			.map((record: DownloadRecord) => ({
				filename: record.filename,
				download_path: `${setting.mod_download_path}\\${setting.selected_game}`,
				expected_bytes_downloaded: record.bytes_downloaded,
				total_size: record.total_size,
			}));

		if (syncRequests.length === 0) {
			return results;
		}

		const syncResults: {
			filename: string;
			actual_bytes_downloaded: number;
			status: string;
		}[] = await invoke('sync_downloads', {
			downloads: syncRequests,
		});

		const updatedResults = results.map((record: DownloadRecord) => {
			const syncResult = syncResults.find(
				r => r.filename === record.filename,
			);

			if (syncResult) {
				return {
					...record,
					bytes_downloaded: syncResult.actual_bytes_downloaded,
					status: syncResult.status,
				};
			}

			return record;
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

		return updatedResults;
	}

	public async add(
		app_id: number,
		item_id: number,
		filename: string,
		nexus_result: NexusDownloadResponse,
	): Promise<number> {
		// Delete previous attempt that ended with error if exists
		const deleteQuery = `
            DELETE FROM downloads 
            WHERE filename = ? AND status = 'error'
        `;
		await dbWrapper.db.execute(deleteQuery, [filename]);

		const checkIfExists: any = await dbWrapper.db.select(
			`SELECT * FROM downloads WHERE app_id = ? AND item_id = ? AND status != 'completed'`,
			[app_id, item_id],
		);

		if (checkIfExists && checkIfExists[0]) {
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

		if (!this.isProcessing) {
			await this.resume();
		}

		return result.lastInsertId;
	}

	public async resume(): Promise<void> {
		this.isProcessing = true;
		await this.processNextDownload();
	}

	public async pause(): Promise<void> {
		this.isProcessing = false;
		await invoke('pause_download');
	}

	public async remove(downloadId: number): Promise<void> {
		const result: any = await dbWrapper.db.select(
			`SELECT * FROM downloads WHERE id = ?`,
			[downloadId],
		);
		if (!result || !result[0]) {
			throw new Error('Download record could not be found.');
		}

		const downloadRecord = result[0];
		const setting = await SettingModel.retrieve();
		await invoke('remove_download', {
			download_path: `${setting.mod_download_path}\\${setting.selected_game}`,
			filename: downloadRecord.filename,
		});

		await dbWrapper.db.execute('DELETE FROM downloads WHERE id = ?', [
			downloadId,
		]);
	}

	public async hideToggle(downloadId: number): Promise<void> {
		const result: any = await dbWrapper.db.select(
			`SELECT * FROM downloads WHERE id = ?`,
			[downloadId],
		);
		if (!result || !result[0]) {
			throw new Error('Download record could not be found.');
		}

		const downloadRecord = result[0];
		await dbWrapper.db.execute(
			'UPDATE downloads SET hidden = ? WHERE id = ?',
			[downloadRecord.hidden ? 0 : 1, downloadId],
		);
	}

	public onProgress(callback: ProgressCallback): void {
		this.progressCallback = callback;
	}

	private async processNextDownload(): Promise<void> {
		if (!this.isProcessing) return;

		const query = `
            SELECT * FROM downloads 
            WHERE status IN ('queued', 'in_progress') 
            ORDER BY id 
            LIMIT 1
        `;
		const results: any = await dbWrapper.db.select(query);

		if (results.length === 0) {
			this.isProcessing = false;
			return;
		}

		const download = results[0] as DownloadRecord;

		try {
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
		} catch (error) {
			toastError(error);
			await dbWrapper.db.execute(
				'UPDATE downloads SET status = "error" WHERE id = ?',
				[download.id],
			);
			await this.processNextDownload();
		}
	}

	private async setupDownloadProgressListener(): Promise<void> {
		try {
			this.unlistenDownloadProgress = await listen<{
				download_id: number;
				bytes_downloaded: number;
				total_size: number;
			}>('download-progress', async event => {
				const { download_id, bytes_downloaded, total_size } =
					event.payload;

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

				if (this.progressCallback) {
					this.progressCallback(event.payload);
				}
			});
		} catch (error) {
			toastError(error);
		}

		try {
			this.unlistenDownloadProgress = await listen<{
				download_id: number;
				bytes_downloaded: number;
				total_size: number;
			}>('download-complete', async event => {
				const { download_id } = event.payload;
				await dbWrapper.db.execute(
					'UPDATE downloads SET status = "completed" WHERE id = ?',
					[download_id],
				);

				await this.processNextDownload();
				setTimeout(async () => {
					await this.resume();
				}, 1000);
			});
		} catch (error) {
			toastError(error);
		}
	}

	public async cleanup(): Promise<void> {
		if (this.unlistenDownloadProgress) {
			this.unlistenDownloadProgress();
		}
	}
}

export default DownloadManager;
