import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
import { ClearCache } from './clear-cache';

const PROTECTED_PATHS = [
	'C:\\Windows',
	'C:\\Program Files',
	'C:\\Program Files (x86)',
	'C:\\Users\\All Users',
	'C:\\ProgramData',
];

export function Settings() {
	const [installPath, setInstallPath] = useState('');
	const [downloadPath, setDownloadPath] = useState('');

	const {
		setModInstallationPath,
		mod_installation_path,
		setModDownloadPath,
		mod_download_path,
		dependency_confirmation,
		setDependencyConfirmation,
	} = settingStore(
		useShallow(state => ({
			setModInstallationPath: state.setModInstallationPath,
			mod_installation_path: state.mod_installation_path,
			setModDownloadPath: state.setModDownloadPath,
			mod_download_path: state.mod_download_path,
			dependency_confirmation: state.dependency_confirmation,
			setDependencyConfirmation: state.setDependencyConfirmation,
		})),
	);

	const handleFolderSelection = async (type: 'install' | 'download') => {
		const openFolderDialogConfig: OpenDialogOptions = {
			title: 'Select Folder',
			multiple: false,
			directory: true,
		};

		const folder = await open(openFolderDialogConfig);
		if (folder) {
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
					<span className="mx-1 text-orange-500">(mods)</span>
					manually.
				</DialogDescription>
			</DialogHeader>
			<div>
				<div className="flex gap-3">
					<div className="text-md mb-1 flex flex-col font-bold">
						Mod Installation Path
					</div>
				</div>
				<Separator />
				{installPath !== '' ? (
					<>
						<em className="my-2 block text-xs text-red-500">
							{mod_installation_path.replace('/', '\\')}
						</em>
						<em className="my-2 block text-xs text-green-500">
							{installPath.replace('/', '\\')}
						</em>
					</>
				) : (
					<em className="my-2 block text-xs">
						{mod_installation_path.replace('/', '\\')}
					</em>
				)}
				<Separator />
				<div className="mt-2 flex w-full justify-between">
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
					<div className="text-md mb-1 flex flex-col font-bold">
						Downloads Path
					</div>
				</div>
				<Separator />
				{downloadPath !== '' ? (
					<>
						<em className="my-2 block text-xs text-red-500">
							{mod_download_path.replace('/', '\\')}
						</em>
						<em className="my-2 block text-xs text-green-500">
							{downloadPath.replace('/', '\\')}
						</em>
					</>
				) : (
					<em className="my-2 block text-xs">
						{mod_download_path.replace('/', '\\')}
					</em>
				)}
				<Separator />
				<div className="mt-2 flex w-full justify-between">
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
				<div className="flex items-center justify-between">
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

					<ClearCache />
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
