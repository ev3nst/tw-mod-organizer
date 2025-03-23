import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { NativeFileInput } from '@/components/native-file-input';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';
import { Loading } from '@/components/loading';

import { ModItem, modsStore } from '@/lib/store/mods';
import { isSeparator, modSeparatorStore } from '@/lib/store/mod_separator';
import { isEmptyString, toastError } from '@/lib/utils';
import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';

export const InstallMod = () => {
	const [loading, setLoading] = useState(false);

	const [name, setName] = useState('');
	const [nameAutoFilled, setNameAutoFilled] = useState(false);
	const [imageFilePath, setImageFilePath] = useState('');
	const [version, setVersion] = useState('');
	const [categories, setCategories] = useState('');

	const [archivePath, setArchivePath] = useState<string>();
	const [modPath, setModPath] = useState<string>();

	const init_reload = settingStore(state => state.init_reload);
	const setInitReload = settingStore(state => state.setInitReload);
	const selectedGame = settingStore(state => state.selectedGame);
	const mod_installation_path = settingStore(
		state => state.mod_installation_path,
	);

	const mods = modsStore(state => state.mods);
	const downloadedArchivePath = modsStore(
		state => state.downloadedArchivePath,
	);
	const setDownloadedArchivePath = modsStore(
		state => state.setDownloadedArchivePath,
	);
	const downloadedModMeta = modsStore(state => state.downloadedModMeta);
	const setDownloadedModMeta = modsStore(state => state.setDownloadedModMeta);
	const separators = modSeparatorStore(state => state.data);

	const sameNameWithMods = mods.some(
		m =>
			!isSeparator(m) &&
			m.title.toLocaleLowerCase() === name.toLocaleLowerCase(),
	);
	const sameNameWithSeparators = separators.some(
		s => s.title.toLocaleLowerCase() === name.toLocaleLowerCase(),
	);

	const isFormNotValid =
		(isEmptyString(archivePath) && isEmptyString(downloadedArchivePath)) ||
		sameNameWithSeparators ||
		typeof name === 'undefined' ||
		name === null ||
		name === '';

	// Auto Name Resolve
	useEffect(() => {
		if (
			(!isEmptyString(archivePath) ||
				!isEmptyString(downloadedArchivePath)) &&
			(name === '' || name === null)
		) {
			const finalArchivePath =
				(!isEmptyString(archivePath)
					? archivePath
					: downloadedArchivePath) ?? '';
			const zipName = finalArchivePath.split('\\').pop() ?? '';
			let predictName = zipName;
			if (predictName.includes('-')) {
				predictName = predictName.split('-')[0];
			}

			setName(predictName);
			setNameAutoFilled(true);
		} else if (
			nameAutoFilled === true &&
			isEmptyString(archivePath) &&
			isEmptyString(downloadedArchivePath)
		) {
			setName('');
			setNameAutoFilled(false);
		}
	}, [nameAutoFilled, archivePath, downloadedArchivePath, name]);

	// Archive Parsing
	useEffect(() => {
		if (
			!isEmptyString(archivePath) ||
			!isEmptyString(downloadedArchivePath)
		) {
			const onArchiveSelect = async (archivePath: string) => {
				try {
					const zipContents = await api.zip_contents(archivePath);
					if (zipContents.length === 0) {
						toast.error(
							'Zip contents are empty or there was an error file fetching the contents.',
						);
						setArchivePath(undefined);
						return;
					}

					switch (selectedGame!.type) {
						case 'totalwar':
							const packFiles = zipContents.filter(zc =>
								zc.filename.endsWith('.pack'),
							);
							if (packFiles.length !== 1) {
								toast.error(
									'Multiple .pack files or none were found in given archive.',
								);
								setArchivePath(undefined);
								return;
							}

							const twModFile = packFiles[0];
							const twExistingMod = mods.find(
								m =>
									!isSeparator(m) &&
									(m as ModItem).mod_file ===
										twModFile.filename,
							);
							if (twExistingMod) {
								toast.error(
									`This .pack file already exists inside the mod with a name of: ${twExistingMod.title} `,
								);
								setArchivePath(undefined);
								return;
							}

							setModPath(twModFile.filename);
							break;

						case 'bannerlord':
							const subModuleFiles = zipContents
								.sort(
									(a, b) =>
										a.filename.length - b.filename.length,
								)
								.filter(zc =>
									zc.filename.endsWith('SubModule.xml'),
								);
							if (subModuleFiles.length !== 1) {
								toast.error(
									'Multiple SubModule.xml files or none were found in given archive.',
								);
								setArchivePath(undefined);
								return;
							}

							const blModFile =
								subModuleFiles[0].filename.replace(
									'\\SubModule.xml',
									'\\',
								);
							setModPath(blModFile);
							break;
						default:
							break;
					}

					const imageFiles = zipContents.filter(
						zc =>
							zc.filename.endsWith('.jpg') ||
							zc.filename.endsWith('.png'),
					);
					if (imageFiles.length > 0) {
						setImageFilePath(imageFiles[0].filename);
					}
				} catch (error) {
					toastError(error);
				}
			};
			onArchiveSelect(
				(!isEmptyString(archivePath)
					? archivePath
					: downloadedArchivePath) ?? '',
			);
		}
	}, [archivePath, downloadedArchivePath]);

	// Install Mod
	const handleSubmit = async () => {
		if (isFormNotValid) {
			return;
		}

		setLoading(true);
		try {
			const finalArchivePath =
				(!isEmptyString(archivePath)
					? archivePath
					: downloadedArchivePath) ?? '';

			if (sameNameWithMods) {
				const existingMod = mods.find(
					m =>
						!isSeparator(m) &&
						m.title.toLocaleLowerCase() ===
							name.toLocaleLowerCase(),
				) as ModItem;

				if (
					existingMod.item_type === 'local_mod' ||
					existingMod.item_type === 'nexus_mod'
				) {
					await api.delete_mod(
						selectedGame!.steam_id,
						existingMod.identifier,
					);
				} else {
					toast.error(
						'Mod with this same name cannot be automatically removed, therefore installation process is terminated.',
					);
					return;
				}
			}

			await api.install_mod(
				selectedGame!.steam_id,
				{
					identifier: uuidv4(),
					title: name,
					zip_file_path: finalArchivePath,
					mod_file_path: modPath as string,
					image_file_path:
						imageFilePath === '' ? undefined : imageFilePath,
					preview_url: downloadedModMeta.preview_url ?? '',
					url: downloadedModMeta.mod_url ?? '',
					categories,
					version:
						version !== ''
							? version
							: (downloadedModMeta.version ?? version),
				},
				mod_installation_path,
			);

			toast.success('Mod installed.');
			setName('');
			setCategories('');
			setVersion('');
			setArchivePath('');
			setModPath('');
			setDownloadedArchivePath('');
			setDownloadedModMeta({});
			setInitReload(!init_reload);
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col w-full max-h-[380px] overflow-y-auto">
			<div className="grid grid-cols-4 items-center gap-3 pt-3">
				<Label>
					Name <span className="text-red-500">*</span>
				</Label>
				<Input
					autoComplete="off"
					autoCorrect="off"
					className="col-span-3"
					placeholder="Provide name for this mod"
					value={name}
					onChange={e => setName(e.currentTarget.value)}
				/>
			</div>
			{sameNameWithSeparators && (
				<p className="text-red-500 text-sm mt-1">
					A separator with this name already exists.
				</p>
			)}

			<div className="grid grid-cols-4 items-center gap-3 pt-3">
				<Label>Categories</Label>
				<Input
					autoComplete="off"
					autoCorrect="off"
					className="col-span-3"
					placeholder="(Optional)"
					value={categories}
					onChange={e => setCategories(e.currentTarget.value)}
				/>
			</div>

			<div className="grid grid-cols-4 items-center gap-3 pt-3">
				<Label>Version</Label>
				<Input
					autoComplete="off"
					autoCorrect="off"
					className="col-span-3"
					placeholder="(Optional)"
					value={version}
					onChange={e => setVersion(e.currentTarget.value)}
				/>
			</div>

			<div className="grid grid-cols-4 items-center gap-3 mt-4">
				<Label>Archive</Label>
				<NativeFileInput
					key={archivePath}
					className="col-span-3"
					dialogTitle={
						archivePath
							? (archivePath.split('\\').pop() ??
								'Select Archive')
							: 'Select Archive'
					}
					extensionFilter={['zip', 'rar', '7z']}
					onFileChange={file => {
						setArchivePath(file.path);
						return true;
					}}
				/>
			</div>

			{typeof downloadedModMeta.preview_url !== 'undefined' &&
				downloadedModMeta.preview_url !== null &&
				downloadedModMeta.preview_url !== '' && (
					<div>
						<img
							src={downloadedModMeta.preview_url}
							className="h-[50px]"
						/>
					</div>
				)}

			{sameNameWithMods && (
				<div className="grid items-center mt-4">
					<Separator className="flex-grow mb-4" />
					<p className="mb-4 text-sm ">
						Mod with same name exists. If you proceed to install it
						with this name and if its a local mod existing mod will
						be replaced. If its a
						<span className="text-blue-500 mx-1">steam</span>
						mod action will fail.
					</p>
				</div>
			)}

			<Button
				variant="info"
				className={`mt-4 ${
					isFormNotValid || loading ? 'disabled' : ''
				}`}
				disabled={isFormNotValid || loading}
				onClick={handleSubmit}
			>
				Create
				{loading && <Loading />}
			</Button>
		</div>
	);
};
