import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { RadioGroup, RadioGroupItem } from '@/components/radio-group';
import { NativeFileInput } from '@/components/native-file-input';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';
import { Loading } from '@/components/loading';

import api from '@/lib/api';
import { modsStore } from '@/lib/store/mods';
import { modSeparatorStore } from '@/lib/store/mod_separator';
import { toastError } from '@/lib/utils';
import { settingStore } from '@/lib/store/setting';

export const InstallMod = () => {
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState('');
	const [nameAutoFilled, setNameAutoFilled] = useState(false);
	const [url, setURL] = useState('');
	const [previewURL, setPreviewURL] = useState('');
	const [version, setVersion] = useState('');
	const [categories, setCategories] = useState('');
	const [packFiles, setPackFiles] = useState<string[]>([]);
	const [selectedPackFile, setSelectedPackFile] = useState('');

	const init_reload = settingStore(state => state.init_reload);
	const setInitReload = settingStore(state => state.setInitReload);
	const selectedGame = settingStore(state => state.selectedGame);
	const mod_installation_path = settingStore(
		state => state.mod_installation_path,
	);

	const mods = modsStore(state => state.mods);
	const separators = modSeparatorStore(state => state.data);
	const modFilePath = modsStore(state => state.modFilePath);
	const setModFilePath = modsStore(state => state.setModFilePath);
	const modFileMeta = modsStore(state => state.modFileMeta);

	const sameNameWithMods = mods.some(
		m => m.title.toLocaleLowerCase() === name.toLocaleLowerCase(),
	);
	const sameNameWithSeparators = separators.some(
		s => s.title.toLocaleLowerCase() === name.toLocaleLowerCase(),
	);

	const checkForMultiplePackFiles = useCallback(async () => {
		if (
			typeof modFilePath !== 'undefined' &&
			modFilePath !== null &&
			modFilePath !== ''
		) {
			try {
				const zipContents = await api.get_zip_contents(modFilePath);
				if (zipContents.length === 0) {
					toast.error(
						'Zip contents are empty or there was an error file fetching the contents.',
					);
					return;
				}

				const packFiles = zipContents.filter(zc =>
					zc.filename.endsWith('.pack'),
				);
				if (packFiles.length === 0) {
					toast.error(
						'This archive does not appear to contain any .pack file.',
					);
					setPackFiles([]);
					setURL('');
					setNameAutoFilled(false);
					setPreviewURL('');
					setSelectedPackFile('');
					setModFilePath('');
					return;
				}

				setPackFiles(packFiles.map(pf => pf.filename));
				setSelectedPackFile(packFiles[0].filename);

				if (
					typeof modFileMeta !== 'undefined' &&
					typeof modFileMeta.mod_file_path !== 'undefined' &&
					modFileMeta.mod_file_path.replace('\\\\', '\\') ===
						modFilePath
				) {
					setURL(modFileMeta.mod_url ?? '');
					setPreviewURL(modFileMeta.preview_url ?? '');
					setVersion(modFileMeta.version ?? '');
				}
			} catch (error) {
				toastError(error);
			}
		}
	}, [modFilePath]);

	useEffect(() => {
		checkForMultiplePackFiles();
	}, [checkForMultiplePackFiles]);

	useEffect(() => {
		if (
			nameAutoFilled === false &&
			typeof modFilePath !== 'undefined' &&
			modFilePath !== null &&
			modFilePath !== '' &&
			(name === '' || name === null)
		) {
			const zipName = modFilePath.split('\\').pop() ?? '';
			let predictName = zipName;
			if (predictName.includes('-')) {
				predictName = predictName.split('-')[0];
			}

			setName(predictName);
			setNameAutoFilled(true);
		}
	}, [nameAutoFilled, modFilePath, name]);

	const handleSubmit = async () => {
		setLoading(true);
		try {
			await api.install_mod(
				selectedGame!.steam_id,
				{
					identifier: uuidv4(),
					title: name,
					zip_file_path: modFilePath,
					pack_file_path: selectedPackFile,
					url,
					preview_url: previewURL,
					categories,
					version,
				},
				mod_installation_path,
			);
			toast.success('Mod installed.');
			setInitReload(!init_reload);
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	const isFormNotValid =
		typeof selectedPackFile === 'undefined' ||
		selectedPackFile === null ||
		selectedPackFile === '' ||
		typeof name === 'undefined' ||
		name === null ||
		name === '';

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
					key={modFilePath}
					className="col-span-3"
					dialogTitle="Select Archive"
					extensionFilter={['zip', 'rar', '7z']}
					onFileChange={file => {
						setModFilePath(file.path);
						return true;
					}}
				/>
			</div>

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

			{packFiles.length > 1 && (
				<RadioGroup
					className="mt-4"
					defaultValue={packFiles[0]}
					onValueChange={value => setSelectedPackFile(value)}
				>
					<p className="text-sm mb-2">
						Multiple .pack files found, please select which one to
						install. You may install same archive multiple times for
						different packs if desired.
					</p>
					{packFiles.map(pf => (
						<div
							key={`rgi_${pf}`}
							className="flex items-center space-x-2 mt-1"
						>
							<RadioGroupItem id={`rgi_${pf}`} value={pf} />
							<Label htmlFor={`rgi_${pf}`}>{pf}</Label>
						</div>
					))}
				</RadioGroup>
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
