import { useState } from 'react';
import { EyeIcon, FolderIcon } from 'lucide-react';
import { toast } from 'sonner';

import { open, type OpenDialogOptions } from '@tauri-apps/plugin-dialog';

import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
} from '@/components/dialog';
import { Checkbox } from '@/components/checkbox';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';

export function Settings() {
	const [installPath, setInstallPath] = useState('');
	const [downloadPath, setDownloadPath] = useState('');

	const setModInstallationPath = settingStore(
		state => state.setModInstallationPath,
	);
	const mod_installation_path = settingStore(
		state => state.mod_installation_path,
	);
	const setModDownloadPath = settingStore(state => state.setModDownloadPath);
	const mod_download_path = settingStore(state => state.mod_download_path);
	const dependency_confirmation = settingStore(
		state => state.dependency_confirmation,
	);
	const setDependencyConfirmation = settingStore(
		state => state.setDependencyConfirmation,
	);

	const handleFolderSelection = async (type: 'install' | 'download') => {
		const openFolderDialogConfig: OpenDialogOptions = {
			title: 'Select Folder',
			multiple: false,
			directory: true,
		};

		const folder = await open(openFolderDialogConfig);
		if (folder) {
			const PROTECTED_PATHS = [
				'C:\\Windows',
				'C:\\Program Files',
				'C:\\Program Files (x86)',
				'C:\\Users\\All Users',
				'C:\\ProgramData',
			];
			const isProtectedPath = PROTECTED_PATHS.some(protectedPath =>
				folder.startsWith(protectedPath),
			);
			const isProtectedPathRev = PROTECTED_PATHS.some(protectedPath =>
				folder.startsWith(protectedPath.replace('\\', '/')),
			);

			if (isProtectedPath || isProtectedPathRev) {
				toast.error(
					'Selected folder is in a protected path. Please choose a different folder.',
				);
				return;
			}

			if (type === 'install') {
				setInstallPath(folder);
			} else {
				setDownloadPath(folder);
			}
		}
	};

	const handleSubmit = () => {
		if (installPath) {
			setModInstallationPath(installPath);
		}

		if (downloadPath) {
			setModDownloadPath(downloadPath);
		}

		toast.success('Changes are saved.');
	};

	return (
		<div className="flex flex-col gap-4">
			<DialogHeader>
				<DialogDescription>
					Contents of the paths will not be moved. Please move the
					contents
					<span className="text-orange-500 mx-1">(mods)</span>
					manually.
				</DialogDescription>
			</DialogHeader>
			<div>
				<div className="flex gap-3">
					<div className="flex flex-col text-md font-bold mb-1">
						Mod Installation Path
					</div>
				</div>
				<Separator />
				{installPath !== '' ? (
					<>
						<em className="text-xs my-2 block text-red-500">
							{mod_installation_path.replace('/', '\\')}
						</em>
						<em className="text-xs my-2 block text-green-500">
							{installPath.replace('/', '\\')}
						</em>
					</>
				) : (
					<em className="text-xs my-2 block">
						{mod_installation_path.replace('/', '\\')}
					</em>
				)}
				<Separator />
				<div className="w-full flex justify-between mt-2">
					<Button
						size="sm"
						variant="info-outline"
						type="button"
						onClick={() => handleFolderSelection('install')}
					>
						<FolderIcon />
						Choose which path for mods to be installed
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() =>
							api.highlight_path(mod_installation_path)
						}
					>
						<EyeIcon />
						View
					</Button>
				</div>
			</div>

			<div>
				<div className="flex gap-3">
					<div className="flex flex-col text-md font-bold mb-1">
						Downloads Path
					</div>
				</div>
				<Separator />
				{downloadPath !== '' ? (
					<>
						<em className="text-xs my-2 block text-red-500">
							{mod_download_path.replace('/', '\\')}
						</em>
						<em className="text-xs my-2 block text-green-500">
							{downloadPath.replace('/', '\\')}
						</em>
					</>
				) : (
					<em className="text-xs my-2 block">
						{mod_download_path.replace('/', '\\')}
					</em>
				)}
				<Separator />
				<div className="w-full flex justify-between mt-2">
					<Button
						size="sm"
						variant="info-outline"
						type="button"
						onClick={() => handleFolderSelection('download')}
					>
						<FolderIcon />
						Choose which path for archives to be downloaded
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => api.highlight_path(mod_download_path)}
					>
						<EyeIcon />
						View
					</Button>
				</div>
				<Separator className="my-4" />

				<div className="flex items-center space-x-2">
					<Checkbox
						id="dependency_confirmation"
						checked={dependency_confirmation === 1}
						onCheckedChange={isChecked =>
							setDependencyConfirmation(isChecked ? 1 : 0)
						}
					/>
					<label
						htmlFor="dependency_confirmation"
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Mod dependency confirmation
					</label>
				</div>
			</div>

			<DialogFooter>
				<Button
					type="button"
					variant="info"
					className={
						installPath === '' && downloadPath === ''
							? 'disabled'
							: ''
					}
					disabled={installPath === '' && downloadPath === ''}
					onClick={handleSubmit}
				>
					Save changes
				</Button>
			</DialogFooter>
		</div>
	);
}
