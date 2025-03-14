import { useState, useEffect } from 'react';
import {
	ArrowDownIcon,
	RocketIcon,
	XCircleIcon,
	CheckCircleIcon,
	CircleDotDashedIcon,
} from 'lucide-react';

import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';

import { determineErrorMessage } from '@/lib/utils';

type UpdateState = {
	currentVersion: string;
	version: string;
	date?: string;
	body?: string;
};

const formatBytes = (bytes: number, decimals = 2) => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const Updater = () => {
	const [updateAvailable, setUpdateAvailable] = useState(false);
	const [checkingForUpdate, setCheckingForUpdate] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [totalSize, setTotalSize] = useState(0);
	const [updateDetails, setUpdateDetails] = useState<UpdateState>();
	const [error, setError] = useState<string>();
	const [isUpdating, setIsUpdating] = useState(false);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [updateComplete, setUpdateComplete] = useState(false);

	useEffect(() => {
		checkForUpdates(true);
	}, []);

	const checkForUpdates = async (silent = false) => {
		try {
			if (!silent) {
				setCheckingForUpdate(true);
			}

			const update = await check();
			if (update) {
				setUpdateAvailable(true);
				setUpdateDetails({
					version: update.version,
					currentVersion: update.currentVersion,
					date: update.date,
					body: update.body,
				});

				if (!silent) {
					setUpdateDialogOpen(true);
				}
			} else {
				setUpdateAvailable(false);
				if (!silent) {
					setUpdateDialogOpen(true);
				}
			}

			if (!silent) {
				setCheckingForUpdate(false);
			}

			return update;
		} catch (error) {
			const errorMessage = determineErrorMessage(error);
			setError(`Error checking for updates: ${errorMessage}`);
			console.error(error);

			if (!silent) {
				setCheckingForUpdate(false);
				setUpdateDialogOpen(true);
			}

			return null;
		}
	};

	const downloadAndInstallUpdate = async () => {
		try {
			const update = await check();
			if (!update) return;

			setIsUpdating(true);
			setDownloadProgress(0);
			setError('');

			let downloadedBytes = 0;

			await update.downloadAndInstall(event => {
				switch (event.event) {
					case 'Started':
						if (event.data.contentLength) {
							setTotalSize(event.data.contentLength);
						} else {
							setTotalSize(0);
						}
						break;
					case 'Progress':
						downloadedBytes += event.data.chunkLength;
						setDownloadProgress(downloadedBytes);
						break;
					case 'Finished':
						setUpdateComplete(true);
						break;
				}
			});

			setTimeout(async () => {
				await relaunch();
			}, 2000);
		} catch (error) {
			const errorMessage = determineErrorMessage(error);
			setError(`Error during update: ${errorMessage}`);
			setIsUpdating(false);
			console.error(error);
		}
	};

	const progressPercentage =
		totalSize > 0 ? Math.round((downloadProgress / totalSize) * 100) : 0;

	return (
		<Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					variant="ghost"
					className="relative flex items-center justify-center"
					onClick={() => checkForUpdates(false)}
					disabled={checkingForUpdate}
				>
					{updateAvailable ? (
						<>
							<ArrowDownIcon className="h-4 w-4" />
						</>
					) : (
						<CircleDotDashedIcon
							className={`h-4 w-4 ${
								checkingForUpdate ? 'animate-spin' : ''
							}`}
						/>
					)}
					<span className="sr-only">
						{updateAvailable
							? 'Update Available'
							: 'Check for Updates'}
					</span>
					<div className="text-sm text-muted-foreground">v0.2.2</div>
				</Button>
			</DialogTrigger>
			<DialogContent
				className="w-[500px]"
				onEscapeKeyDown={e => {
					if (isUpdating) e.preventDefault();
				}}
				onInteractOutside={e => {
					if (isUpdating) e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{updateAvailable ? (
							<>
								<ArrowDownIcon className="h-5 w-5 text-blue-500" />
								Update Available
							</>
						) : error ? (
							<>
								<XCircleIcon className="h-5 w-5 text-red-500" />
								Update Check Failed
							</>
						) : (
							<>
								<CheckCircleIcon className="h-5 w-5 text-green-500" />
								Software Update
							</>
						)}
					</DialogTitle>
					{!error && !isUpdating && (
						<DialogDescription>
							{updateAvailable
								? 'A new version of the application is available. Would you like to update now?'
								: 'Your application is up to date.'}
						</DialogDescription>
					)}
				</DialogHeader>

				{typeof error !== 'undefined' && error !== '' && (
					<div className="mb-4 text-red-500">
						<p>{error}</p>
					</div>
				)}

				{updateDetails && !isUpdating && !error && (
					<div className="space-y-2">
						<div className="grid grid-cols-3 gap-2 text-sm">
							<span className="font-medium">
								Current Version:
							</span>
							<span className="col-span-2">
								{updateDetails.currentVersion}
							</span>

							<span className="font-medium">New Version:</span>
							<span className="col-span-2 font-semibold text-blue-600">
								{updateDetails.version}
							</span>

							{updateDetails.date && (
								<>
									<span className="font-medium">
										Released:
									</span>
									<span className="col-span-2">
										{updateDetails.date}
									</span>
								</>
							)}
						</div>

						{updateDetails.body && (
							<>
								<Separator className="my-2" />
								<div>
									<span className="font-medium">
										Release Notes:
									</span>
									<p className="text-sm mt-1 max-h-32 overflow-y-auto">
										{updateDetails.body}
									</p>
								</div>
							</>
						)}
					</div>
				)}

				{isUpdating && (
					<div className="space-y-3 py-2">
						{updateComplete ? (
							<div className="text-center space-y-2">
								<CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto" />
								<p className="font-medium">Update complete!</p>
								<p className="text-sm text-gray-500">
									Restarting application...
								</p>
							</div>
						) : (
							<>
								<p className="text-sm font-medium text-center">
									Downloading and installing update...
								</p>

								<div className="w-full bg-gray-200 rounded-full h-2">
									{totalSize > 0 ? (
										<div
											className="bg-blue-600 h-2 rounded-full transition-all duration-300"
											style={{
												width: `${progressPercentage}%`,
											}}
										></div>
									) : (
										<div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
									)}
								</div>

								<p className="text-xs text-gray-500 text-center">
									{totalSize > 0
										? `${formatBytes(
												downloadProgress,
											)} of ${formatBytes(
												totalSize,
											)} (${progressPercentage}%)`
										: `${formatBytes(
												downloadProgress,
											)} downloaded (size unknown)`}
								</p>
							</>
						)}
					</div>
				)}

				<DialogFooter className="flex gap-2">
					{!isUpdating ? (
						<>
							{updateAvailable && !error && (
								<Button
									variant="success"
									onClick={downloadAndInstallUpdate}
								>
									<RocketIcon className="h-4 w-4" />
									Update Now
								</Button>
							)}

							<Button
								variant="outline"
								onClick={() => setUpdateDialogOpen(false)}
								disabled={isUpdating}
							>
								{updateAvailable && !error ? 'Later' : 'Close'}
							</Button>
						</>
					) : (
						<Button
							variant="outline"
							onClick={() => setUpdateDialogOpen(false)}
							disabled={!error}
						>
							{error ? 'Close' : 'Installing...'}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
