import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';

import { SidebarInput } from '@/components/sidebar';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/button';

import api, { SaveFile } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modActivationStore } from '@/lib/store/mod_activation';
import { formatFileSize, toastError } from '@/lib/utils';

export const Saves = () => {
	const [saveFiles, setSaveFiles] = useState<SaveFile[]>([]);
	const [filteredSaveFiles, setFilteredSaveFiles] = useState<SaveFile[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(5);

	const saveFilePath = modActivationStore(state => state.saveFilePath);
	const setSaveFilePath = modActivationStore(state => state.setSaveFilePath);

	const selectedGame = settingStore(state => state.selectedGame);

	useEffect(() => {
		const initializeSaveFiles = async () => {
			try {
				const files = await api.get_save_files(selectedGame!.steam_id);
				setSaveFiles(files);
				setFilteredSaveFiles(files);
			} catch (error) {
				toastError(error);
			}
		};

		if (selectedGame) {
			initializeSaveFiles();
		}
	}, [selectedGame]);

	useEffect(() => {
		const filtered = saveFiles.filter(file =>
			file.filename.toLowerCase().includes(searchQuery.toLowerCase()),
		);
		setFilteredSaveFiles(filtered);
		setCurrentPage(1);
	}, [searchQuery, saveFiles]);

	const totalItems = filteredSaveFiles.length;
	const paginatedFiles = filteredSaveFiles.slice(
		(currentPage - 1) * perPage,
		currentPage * perPage,
	);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};

	const handleDeleteFile = async (
		e: React.MouseEvent,
		saveFile: SaveFile,
	) => {
		e.stopPropagation();
		await api.delete_save_file(selectedGame!.steam_id, saveFile.filename);

		const newSaveFiles = saveFiles.filter(
			file => file.filename !== saveFile.filename,
		);
		setSaveFiles(newSaveFiles);

		if (saveFilePath === saveFile.path) {
			setSaveFilePath(undefined);
		}
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePerPageChange = (newPerPage: number) => {
		setPerPage(newPerPage);
		setCurrentPage(1);
	};

	return (
		<div>
			<div className="flex gap-4 items-center px-3 mb-2">
				<SidebarInput
					placeholder="Type to search..."
					value={searchQuery}
					onChange={handleSearchChange}
				/>
			</div>

			{paginatedFiles.length > 0 ? (
				paginatedFiles.map((sf, sfi) => (
					<div
						key={`save_${sf.date}_${sfi}`}
						className={`p-3 hover:cursor-pointer hover:bg-black/90 relative ${
							saveFilePath === sf.path ? 'bg-black/90' : ''
						}`}
						onClick={() => {
							setSaveFilePath(
								saveFilePath === sf.path ? undefined : sf.path,
							);
						}}
					>
						<div
							className={`text-xs font-medium leading-none ${
								saveFilePath === sf.path ? 'text-green-500' : ''
							}`}
						>
							<span>{sf.filename}</span>
							<div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
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
						<Button
							className="hover:text-red-500 h-6 w-6 absolute right-3 top-0 [&_svg]:size-3"
							variant="ghost"
							size="icon"
							onClick={e => handleDeleteFile(e, sf)}
						>
							<XIcon />
						</Button>
					</div>
				))
			) : (
				<div className="text-center p-4 text-muted-foreground">
					No save files found
				</div>
			)}

			<div className="px-3 mt-3">
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
