import { useEffect, useState } from 'react';
import {
	ArrowDownUpIcon,
	FolderIcon,
	InfoIcon,
	RemoveFormattingIcon,
	TypeIcon,
	XIcon,
} from 'lucide-react';

import { listen } from '@tauri-apps/api/event';

import { SidebarInput } from '@/components/sidebar';
import { PaginationControls } from '@/components/pagination-controls';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modActivationStore } from '@/lib/store/mod_activation';
import { saveFilesStore, type SaveFile } from '@/lib/store/save_files';
import { formatFileSize, toastError } from '@/lib/utils';

export const Saves = () => {
	const [saveFiles, setSaveFiles] = useState<SaveFile[]>([]);
	const [filteredSaveFiles, setFilteredSaveFiles] = useState<SaveFile[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(5);

	const compact_save_names = settingStore(state => state.compact_save_names);
	const setCompactSaveNames = settingStore(
		state => state.setCompactSaveNames,
	);

	const setSaveFileDialogOpen = saveFilesStore(
		state => state.setSaveFileDialogOpen,
	);
	const setSelectedSaveFile = saveFilesStore(
		state => state.setSelectedSaveFile,
	);
	const currentlyRunningMods = saveFilesStore(
		state => state.currentlyRunningMods,
	);

	const saveFile = modActivationStore(state => state.saveFile);
	const setSaveFile = modActivationStore(state => state.setSaveFile);

	const isGameRunning = settingStore(state => state.isGameRunning);
	const selectedGame = settingStore(state => state.selectedGame);

	useEffect(() => {
		const initializeSaveFiles = async () => {
			try {
				const files = (
					await api.save_files(selectedGame!.steam_id)
				).sort((a, b) => b.date - a.date);
				setSaveFiles(files);
				setFilteredSaveFiles(files);
			} catch (error) {
				toastError(error);
			}
		};

		setSaveFile(undefined);
		initializeSaveFiles();
	}, [selectedGame!.steam_id]);

	useEffect(() => {
		const filtered = saveFiles.filter(({ filename }) => {
			const nameWithoutSuffix = filename.endsWith(
				'.' + selectedGame!.save_file_extension,
			)
				? filename.slice(0, -5)
				: filename;

			return nameWithoutSuffix
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
		});

		setFilteredSaveFiles(filtered);
		setCurrentPage(1);
	}, [searchQuery, saveFiles]);

	useEffect(() => {
		const setupSaveFileWatcher = async () => {
			await api.save_folder_watch(selectedGame!.steam_id);
			const unlisten = await listen<{
				date: number;
				filename: string;
				filesize: number;
				path: string;
				event_type: 'created' | 'modified';
			}>('save-file', async ({ payload }) => {
				if (!isGameRunning || payload.filesize === 0) return;
				await api.upsert_save_file_meta(
					selectedGame!.steam_id,
					payload.filename,
					payload.filesize,
					currentlyRunningMods,
				);
				setSaveFiles(prev => {
					const existingIndex = prev.findIndex(
						file => file.path === payload.path,
					);

					if (existingIndex !== -1) {
						return prev.map((file, index) =>
							index === existingIndex
								? { ...file, ...payload, meta_exists: true }
								: file,
						);
					} else {
						return [
							...prev,
							{
								filename: payload.filename,
								filesize: payload.filesize,
								path: payload.path,
								date: payload.date,
								meta_exists: true,
							},
						];
					}
				});
			});

			return () => unlisten();
		};

		const cleanup = setupSaveFileWatcher();
		return () => {
			cleanup.then((fn: any) => fn());
		};
	}, [selectedGame!.steam_id, isGameRunning, currentlyRunningMods]);

	const totalItems = filteredSaveFiles.length;
	const paginatedFiles = filteredSaveFiles.slice(
		(currentPage - 1) * perPage,
		currentPage * perPage,
	);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};

	const handleDeleteFile = async (
		event: React.MouseEvent,
		deleteSaveFile: SaveFile,
	) => {
		try {
			event.stopPropagation();
			await api.delete_save_file(
				selectedGame!.steam_id,
				deleteSaveFile.filename,
			);

			const newSaveFiles = saveFiles.filter(
				file => file.filename !== deleteSaveFile.filename,
			);
			setSaveFiles(newSaveFiles);

			if (saveFile?.path === deleteSaveFile.path) {
				setSaveFile(undefined);
			}
		} catch (error) {
			toastError(error);
		}
	};

	const handleSaveFileMeta = async (
		event: React.MouseEvent,
		sf: SaveFile,
	) => {
		try {
			event.stopPropagation();
			const save_meta_data = await api.fetch_save_file_meta(
				selectedGame!.steam_id,
				sf.filename,
			);
			setSelectedSaveFile({
				filename: sf.filename,
				filesize: sf.filesize,
				path: sf.path,
				load_order_data: save_meta_data.mod_order_data,
			});
			setSaveFileDialogOpen(true);
		} catch (error) {
			toastError(error);
		}
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePerPageChange = (newPerPage: number) => {
		setPerPage(newPerPage);
		setCurrentPage(1);
	};

	const handleFileSort = () => {
		setSaveFiles([...saveFiles].reverse());
	};

	function cleanFileName(filename: string) {
		if (filename.endsWith('.sav')) {
			return filename
				.replace(/\.[^/.]+$/, '')
				.replace(/[0-9a-fA-F]+$/, '');
		}

		if (filename.includes('.')) {
			let nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
			let finalName = nameWithoutExt.split('.')[0];
			return finalName;
		}
		return filename;
	}

	return (
		<div>
			<div className="mb-2 flex items-center gap-4 px-3">
				<SidebarInput
					placeholder="Type to search..."
					value={searchQuery}
					onChange={handleSearchChange}
				/>
				<Button size="icon" variant="ghost" onClick={handleFileSort}>
					<ArrowDownUpIcon />
				</Button>
			</div>
			<div className="mb-2 flex items-center justify-between gap-4">
				<p className="px-3 text-sm text-muted-foreground">
					You can select a save file to continue.
				</p>
				<div className="flex items-center gap-1 pe-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="size-5 hover:text-blue-500 [&_svg]:size-3"
								variant="ghost"
								size="icon"
								onClick={() =>
									setCompactSaveNames(
										compact_save_names === 0 ? 1 : 0,
									)
								}
							>
								{compact_save_names ? (
									<RemoveFormattingIcon />
								) : (
									<TypeIcon />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Compact save names</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="size-5 hover:text-blue-500 [&_svg]:size-3"
								variant="ghost"
								size="icon"
								onClick={() =>
									api.highlight_path(
										selectedGame?.save_path_folder as string,
									)
								}
							>
								<FolderIcon />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Open Saves Folder</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{paginatedFiles.length > 0 ? (
				paginatedFiles.map((sf, sfi) => (
					<div
						key={`save_${sf.date}_${sfi}`}
						className={`relative p-2 hover:cursor-pointer hover:bg-secondary-bg ${
							saveFile?.path === sf.path ? 'bg-secondary-bg' : ''
						}`}
						onClick={() =>
							setSaveFile(
								saveFile?.path === sf.path ? undefined : sf,
							)
						}
					>
						<div
							className={`flex flex-col justify-between text-xs font-medium leading-none ${
								saveFile?.path === sf.path
									? 'text-green-500'
									: ''
							}`}
						>
							<div
								className={
									!sf.meta_exists
										? 'text-muted-foreground'
										: ''
								}
							>
								{compact_save_names
									? cleanFileName(sf.filename)
									: sf.filename}
							</div>
							<div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
								<span>
									{new Date(sf.date).toLocaleDateString(
										undefined,
										{
											hour: 'numeric',
											minute: 'numeric',
										},
									)}
								</span>
								<span>{formatFileSize(sf.filesize)}</span>
							</div>
						</div>
						<div className="absolute right-1 top-0 flex gap-0">
							{sf.meta_exists && (
								<Button
									className="size-5 hover:text-blue-500 [&_svg]:size-3"
									variant="ghost"
									size="icon"
									onClick={e => handleSaveFileMeta(e, sf)}
								>
									<InfoIcon />
								</Button>
							)}
							<Button
								className="size-5 hover:text-red-500 [&_svg]:size-3"
								variant="ghost"
								size="icon"
								onClick={e => handleDeleteFile(e, sf)}
							>
								<XIcon />
							</Button>
						</div>
					</div>
				))
			) : (
				<div className="p-4 text-center text-muted-foreground">
					No save files found
				</div>
			)}

			<div className="mt-3 px-3">
				<PaginationControls
					currentPage={currentPage}
					totalItems={totalItems}
					perPage={perPage}
					onPageChange={handlePageChange}
					onPerPageChange={handlePerPageChange}
					isCompact
				/>
			</div>
		</div>
	);
};
