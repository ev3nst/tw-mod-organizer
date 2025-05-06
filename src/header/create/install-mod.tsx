import { useEffect, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { RadioGroup, RadioGroupItem } from '@/components/radio-group';
import { NativeFileInput } from '@/components/native-file-input';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { isSeparator, modSeparatorStore } from '@/lib/store/mod_separator';

import api, { ZipItemInfo } from '@/lib/api';
import { cleanFileName, isEmptyString, toastError } from '@/lib/utils';

export const InstallMod = () => {
	const [loading, setLoading] = useState(false);

	const [name, setName] = useState('');
	const [nameAutoFilled, setNameAutoFilled] = useState(false);
	const [imageFilePath, setImageFilePath] = useState('');
	const [version, setVersion] = useState('');
	const [categories, setCategories] = useState('');
	const [modFiles, setModFiles] = useState<ZipItemInfo[]>([]);

	const [archivePath, setArchivePath] = useState<string>();
	const [modPath, setModPath] = useState<string>();

	const { selectedGame, mod_installation_path } = settingStore(
		useShallow(state => ({
			selectedGame: state.selectedGame,
			mod_installation_path: state.mod_installation_path,
		})),
	);

	const {
		mods,
		downloadedArchivePath,
		setDownloadedArchivePath,
		downloadedModMeta,
		setDownloadedModMeta,
		setInstallModItemOpen,
	} = modsStore(
		useShallow(state => ({
			mods: state.mods,
			downloadedArchivePath: state.downloadedArchivePath,
			setDownloadedArchivePath: state.setDownloadedArchivePath,
			downloadedModMeta: state.downloadedModMeta,
			setDownloadedModMeta: state.setDownloadedModMeta,
			setInstallModItemOpen: state.setInstallModItemOpen,
		})),
	);

	const separators = modSeparatorStore(state => state.data);

	const sameNameWithMods = useMemo(
		() =>
			mods.some(
				m =>
					!isSeparator(m) &&
					m.title.toLocaleLowerCase() === name.toLocaleLowerCase(),
			),
		[mods, name],
	);

	const sameNameWithSeparators = useMemo(
		() =>
			separators.some(
				s => s.title.toLocaleLowerCase() === name.toLocaleLowerCase(),
			),
		[separators, name],
	);

	const isFormNotValid = useMemo(
		() =>
			(isEmptyString(archivePath) &&
				isEmptyString(downloadedArchivePath)) ||
			sameNameWithSeparators ||
			typeof name === 'undefined' ||
			name === null ||
			name === '',
		[archivePath, downloadedArchivePath, sameNameWithSeparators, name],
	);

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
			const predictName = cleanFileName(zipName);

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
							{
								const packFiles = zipContents.filter(zc =>
									zc.filename.endsWith('.pack'),
								);

								if (packFiles.length === 0) {
									toast.error(
										'No mod files were found in given archive',
									);
									return;
								}

								if (packFiles.length > 1) {
									setModFiles(packFiles);
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
							}
							break;

						case 'bannerlord':
							{
								const subModuleFiles = zipContents
									.sort(
										(a, b) =>
											a.filename.length -
											b.filename.length,
									)
									.filter(zc =>
										zc.filename.endsWith('SubModule.xml'),
									);

								if (subModuleFiles.length === 0) {
									toast.error(
										'No mod files were found in given archive',
									);
									return;
								}

								if (subModuleFiles.length > 1) {
									setModFiles(subModuleFiles);
								}

								const blModFile =
									subModuleFiles[0].filename.replace(
										'\\SubModule.xml',
										'\\',
									);
								setModPath(blModFile);
							}
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
					setName('');
					setCategories('');
					setVersion('');
					setArchivePath('');
					setModPath('');
					setModFiles([]);
					setDownloadedArchivePath('');
					setDownloadedModMeta({});
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

			const newModIdentifier = uuidv4();
			await api.install_mod(
				selectedGame!.steam_id,
				{
					identifier: newModIdentifier,
					title: name,
					zip_file_path: finalArchivePath,
					mod_file_path: modPath as string,
					image_file_path:
						imageFilePath === '' ? undefined : imageFilePath,
					preview_url: downloadedModMeta.preview_url ?? '',
					url: downloadedModMeta.mod_url ?? '',
					download_url: downloadedModMeta.download_url ?? '',
					categories,
					creator_id: downloadedModMeta.creator_id ?? '',
					creator_name: downloadedModMeta.creator_name ?? '',
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
			setModFiles([]);
			setDownloadedArchivePath('');
			setDownloadedModMeta({});
			setInstallModItemOpen(false);
			setTimeout(() => {
				window.location.reload();
			}, 300);
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex size-full flex-col justify-between">
			<div>
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
					<p className="mt-1 text-sm text-red-500">
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

				<div className="mt-4 grid grid-cols-4 items-center gap-3">
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
					<div className="mt-4 grid items-center">
						<Separator className="mb-4 grow" />
						<p className="mb-4 text-sm ">
							Mod with same name exists. If you proceed to install
							it with this name and if its a local mod existing
							mod will be replaced. If its a
							<span className="mx-1 text-blue-500">steam</span>
							mod action will fail.
						</p>
					</div>
				)}

				{modFiles.length > 1 && (
					<RadioGroup
						className="mt-4"
						defaultValue={modFiles[0].filename}
						onValueChange={value => setModPath(value)}
					>
						<p className="mb-2 text-sm">
							Multiple mod files/folders found, please select
							which one to install. You may install same archive
							multiple times for different packs if desired.
						</p>
						{modFiles.map(pf => (
							<div
								key={`rgi_${pf}`}
								className="mt-1 flex items-center space-x-2"
							>
								<RadioGroupItem
									id={`rgi_${pf.filename}`}
									value={pf.filename}
								/>
								<Label htmlFor={`rgi_${pf.filename}`}>
									{pf.filename}
								</Label>
							</div>
						))}
					</RadioGroup>
				)}
			</div>

			<Button
				variant="info"
				className={`${isFormNotValid || loading ? 'disabled' : ''}`}
				disabled={isFormNotValid || loading}
				onClick={handleSubmit}
			>
				Create
				{loading && <Loading />}
			</Button>
		</div>
	);
};
