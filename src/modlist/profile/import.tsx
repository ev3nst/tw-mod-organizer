import { useState, useEffect } from 'react';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

import { type FileMeta, NativeFileInput } from '@/components/native-file-input';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';
import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import {
	ProfileModel,
	type ProfileExportData,
} from '@/lib/store/profile-model';
import { modsStore, type ModItem } from '@/lib/store/mods';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModActivationModel } from '@/lib/store/mod_activation';
import { ModSeparatorModel, isSeparator } from '@/lib/store/mod_separator';
import { ModMetaItem } from '@/lib/store/mod_meta';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';

export const ImportProfile = () => {
	const [importProfileName, setImportProfileName] = useState('');
	const [copyMeta, setCopyMeta] = useState(true);
	const [importLoading, setImportLoading] = useState(false);
	const [importProcessLoading, setImportProcessLoading] = useState(false);
	const [didInstallNewMods, setDidInstallNewMods] = useState(false);

	const [isImportComplete, setIsImportComplete] = useState(false);
	const [importFile, setImportFile] = useState<FileMeta>();
	const [profileExportData, setProfileExportData] =
		useState<ProfileExportData>();

	const mods = modsStore(state => state.mods);
	const modsOnly = mods.filter(mod => !isSeparator(mod)) as ModItem[];
	const games = settingStore(state => state.games);
	const setLockScreen = settingStore(state => state.setLockScreen);
	const profiles = profileStore(state => state.profiles);

	let steamModExists: ModItem[] = [];
	let steamModDontExists: ModItem[] = [];
	let localModsExists: ModItem[] = [];
	let localModsDontExists: ModItem[] = [];
	let nexusModsExists: ModItem[] = [];
	let nexusModsDontExists: ModItem[] = [];
	if (profileExportData) {
		steamModExists = profileExportData.mods.filter(
			pm =>
				modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				pm.item_type === 'steam_mod',
		);

		steamModDontExists = profileExportData.mods.filter(
			pm =>
				!modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				pm.item_type === 'steam_mod',
		);

		localModsExists = profileExportData.mods.filter(
			pm =>
				modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				pm.item_type === 'local_mod',
		);

		localModsDontExists = profileExportData.mods.filter(
			pm =>
				!modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				pm.item_type === 'local_mod',
		);

		nexusModsExists = profileExportData.mods.filter(
			pm =>
				modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				pm.item_type === 'nexus_mod',
		);

		nexusModsDontExists = profileExportData.mods.filter(
			pm =>
				!modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				pm.item_type === 'nexus_mod',
		);
	}

	const handleImportFileChange = async (file: FileMeta) => {
		if (!file?.path) return;

		setImportLoading(true);
		try {
			const parsedProfile = await api.parse_profile_json(file.path);
			setImportProfileName(parsedProfile.name);
			setProfileExportData(parsedProfile);
		} catch (error) {
			toastError(error);
			setImportFile(undefined);
		} finally {
			setImportLoading(false);
		}
	};

	const handleImportProcess = async () => {
		if (typeof profileExportData === 'undefined') return;

		const importGame = games.find(
			g => g.steam_id === profileExportData.app_id,
		);
		if (!importGame) {
			toast.error(
				'Imported data seems to have a game that is not supported here.',
			);
			return;
		}

		if (importGame.game_path_exists === false) {
			toast.error(
				`Game installation path for ${importGame.name} has not found therefore import function has been terminated.`,
			);
			return;
		}

		setImportProcessLoading(true);
		setDidInstallNewMods(false);
		try {
			for (let mi = 0; mi < profileExportData.mods.length; mi++) {
				const mod = profileExportData.mods[mi];
				if (
					mod.item_type === 'steam_mod' &&
					!modsOnly.some(mo => mo.identifier === mod.identifier)
				) {
					await api.subscribe(
						profileExportData.app_id,
						Number(mod.identifier),
					);
					setDidInstallNewMods(true);
				}
			}

			const newProfileName =
				importProfileName !== ''
					? importProfileName
					: profileExportData.name.trim();
			const profiles = await ProfileModel.all(profileExportData.app_id);
			const existing = profiles.find(
				p => p.name.toLowerCase() === newProfileName.toLowerCase(),
			);
			if (existing) {
				await existing.delete();
			}

			const newProfile = new ProfileModel({
				id: undefined as any,
				name: newProfileName,
				app_id: profileExportData.app_id,
				is_active: false,
			});
			await newProfile.save();

			const resolvedModOrder = profileExportData.mod_order.map(mr => {
				const mo_mods_mapping = profileExportData.mods.find(
					pdmo => pdmo.identifier === mr.mod_id,
				);
				if (!mo_mods_mapping) return mr;

				const existingLocalMod = modsOnly.find(
					mo => mo.mod_file === mo_mods_mapping!.mod_file,
				);
				if (!existingLocalMod) return mr;

				return {
					...mr,
					mod_id: existingLocalMod.identifier,
					mod_file_path: existingLocalMod.mod_file_path,
				};
			});
			const newModOrder = new ModOrderModel({
				id: undefined as any,
				app_id: profileExportData.app_id,
				profile_id: newProfile.id,
				data: resolvedModOrder,
			});
			await newModOrder.save();

			const resolvedModActivation = profileExportData.mod_activation.map(
				mr => {
					const mo_mods_mapping = profileExportData.mods.find(
						pdmo => pdmo.identifier === mr.mod_id,
					);
					if (!mo_mods_mapping) return mr;

					const existingLocalMod = modsOnly.find(
						mo => mo.mod_file === mo_mods_mapping!.mod_file,
					);
					if (!existingLocalMod) return mr;

					return {
						...mr,
						mod_id: existingLocalMod.identifier,
						mod_file_path: existingLocalMod.mod_file_path,
					};
				},
			);
			const newModActivation = new ModActivationModel({
				id: undefined as any,
				app_id: profileExportData.app_id,
				profile_id: newProfile.id,
				data: resolvedModActivation,
			});
			await newModActivation.save();

			const newSeparators = new ModSeparatorModel({
				id: undefined as any,
				app_id: profileExportData.app_id,
				profile_id: newProfile.id,
				data: profileExportData.mod_separators,
			});
			await newSeparators.save();

			await newProfile.setActive();
			toast.success('Import successful.');
			setIsImportComplete(true);
		} catch (error) {
			toastError(error);
		} finally {
			setImportProcessLoading(false);
		}
	};

	useEffect(() => {
		if (importFile?.path) {
			handleImportFileChange(importFile);
		}
	}, [importFile]);

	const ModItemComponent = ({ item }: { item: ModItem }) => {
		const modExists = modsOnly.some(m => m.mod_file === item.mod_file);
		const isLocalMod = item.item_type !== 'steam_mod';

		let styleClasses = '';

		if (isLocalMod) {
			styleClasses = modExists ? 'text-orange-500' : 'text-red-500';
		} else {
			styleClasses = modExists
				? 'text-white hover:text-blue-500 hover:cursor-pointer'
				: 'text-muted-foreground hover:text-blue-500 hover:cursor-pointer';
		}

		const handleUrlOpen = () => {
			if (isLocalMod) return;
			api.open_external_url(
				`steam://openurl/https://steamcommunity.com/sharedfiles/filedetails/?id=${item.identifier}`,
			);
		};

		return (
			<div
				key={`import_profile_mitem_${item.identifier}`}
				onClick={isLocalMod ? undefined : handleUrlOpen}
				className={`text-sm py-1 ${styleClasses}`}
			>
				{item.title}
				<em className="block text-muted-foreground text-xs">
					{item.mod_file}
				</em>
			</div>
		);
	};

	const MetaItem = ({ meta }: { meta: ModMetaItem }) => {
		if (meta.title === '' && meta.categories === '') {
			return null;
		}

		const modDetail = profileExportData?.mods.find(
			pedm => pedm.identifier === meta.mod_id,
		);

		if (!modDetail) {
			return null;
		}

		return (
			<div
				className="flex flex-col gap-1 py-1"
				key={`import_profile_mod_meta_${meta.mod_id}`}
			>
				<div>{modDetail.title}</div>
				{meta.title && (
					<div className="text-muted-foreground">
						Title: {meta.title}
					</div>
				)}
				{meta.categories && (
					<div className="text-muted-foreground">
						Categories: {meta.categories}
					</div>
				)}
			</div>
		);
	};

	const renderProfileExportSummary = () => {
		if (!profileExportData) return null;

		const importGame = games.find(
			g => g.steam_id === profileExportData.app_id,
		);

		if (!importGame) {
			toast.error(
				'Imported data seems to have a game that is not supported here.',
			);
			return null;
		}

		return (
			<div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
				<b className="mb-2">Import Details:</b>

				<div className="grid grid-cols-4 items-center">
					<div className="col-span-1">Game:</div>
					<div
						className={`col-span-3 ${
							importGame.game_path_exists === false
								? 'text-red-500'
								: ''
						}`}
					>
						{importGame.name}
					</div>
				</div>

				<div className="grid grid-cols-4 items-center">
					<div className="col-span-1">Profile Name:</div>
					<div className="col-span-3">
						<Input
							value={importProfileName}
							onChange={e =>
								setImportProfileName(e.currentTarget.value)
							}
						/>
					</div>
				</div>
				{profiles.some(
					p =>
						p.name.toLowerCase() ===
						importProfileName.trim().toLowerCase(),
				) && (
					<p className="text-red-500 text-sm">
						A profile with same name exists, existing one will be
						deleted before import unless you change it to something
						else.
					</p>
				)}

				<Accordion type="single" collapsible className="w-full">
					<AccordionItem value="mods">
						<AccordionTrigger className="text-md">
							<div className="flex gap-2">
								<span>Mods</span>
								<span className="text-white">
									({steamModExists.length})
								</span>
								<span className="text-muted-foreground">
									({steamModDontExists.length})
								</span>
								<span className="text-blue-500">
									({nexusModsExists.length})
								</span>
								<span className="text-purple-500">
									({nexusModsDontExists.length})
								</span>
								<span className="text-orange-500">
									({localModsExists.length})
								</span>
								<span className="text-red-500">
									({localModsDontExists.length})
								</span>
							</div>
						</AccordionTrigger>
						<AccordionContent>
							<p className="text-muted-foreground">
								<span className="text-white w-[60px] inline-block">
									White
								</span>
								Steam mods that are present.
							</p>
							<p className="text-muted-foreground">
								<span className="text-muted-foreground w-[60px] inline-block">
									Gray
								</span>
								Steam mods that are not present.
							</p>

							<p className="text-muted-foreground">
								<span className="text-blue-500 w-[60px] inline-block">
									Blue
								</span>
								Nexus mods that are found in the system.
							</p>

							<p className="text-muted-foreground">
								<span className="text-purple-500 w-[60px] inline-block">
									Purple
								</span>
								Nexus mods that dont exists.
							</p>

							<p className="text-muted-foreground">
								<span className="text-orange-500 w-[60px] inline-block">
									Orange
								</span>
								Local mods that are found in the system.
							</p>

							<p className="text-muted-foreground">
								<span className="text-red-500 w-[60px] inline-block">
									Red
								</span>
								Local mods that dont exists.
							</p>

							<Separator className="my-3" />
							<div className="flex flex-col gap-1">
								{profileExportData.mods.map(item => (
									<ModItemComponent
										key={`mod-${item.identifier}`}
										item={item}
									/>
								))}
							</div>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="separators">
						<AccordionTrigger className="text-md">
							Separators
						</AccordionTrigger>
						<AccordionContent>
							{profileExportData.mod_separators.map(sep => (
								<div
									key={`import_profile_separator_${sep.identifier}`}
									className="py-1.5 px-3 rounded-sm mb-2"
									style={{
										color: sep.text_color,
										backgroundColor: sep.background_color,
									}}
								>
									{sep.title}
								</div>
							))}
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="meta-info">
						<AccordionTrigger className="text-md">
							Mod Meta Information
						</AccordionTrigger>
						<AccordionContent>
							<div className="flex items-center space-x-2 mb-4">
								<Checkbox
									id="import_profile_copy_meta"
									aria-label="Copy Meta Information"
									checked={copyMeta}
									onCheckedChange={checked =>
										setCopyMeta(!!checked)
									}
								/>
								<label
									htmlFor="import_profile_copy_meta"
									className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									This is completely optional. Unless
									unchecked meta information will be copied as
									well.
								</label>
							</div>

							{profileExportData.mod_meta.map(meta => (
								<MetaItem
									key={`meta-${meta.mod_id}`}
									meta={meta}
								/>
							))}
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		);
	};

	if (isImportComplete) {
		if (didInstallNewMods) {
			setLockScreen(true);
			return (
				<>
					<div
						className="fixed h-screen w-screen select-none hover:cursor-not-allowed z-50"
						onClick={e => e.stopPropagation()}
					/>
					<div className="text-orange-500 text-xl leading-8 bg-background z-10 p-10">
						Import Process within App is complete. You should close
						this application and wait for downloads to complete
						within Steam Client and than re-open the mod manager.
					</div>
				</>
			);
		} else {
			setTimeout(() => {
				window.location.reload();
			}, 150);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-between items-center gap-2">
				<NativeFileInput
					key={importFile?.path || 'file-input'}
					className="w-full"
					size="sm"
					disabled={importLoading}
					dialogTitle="Select Import File"
					variant="info"
					extensionFilter={['json']}
					onFileChange={file => {
						setImportFile(file);
						return true;
					}}
				/>
			</div>

			{profileExportData && renderProfileExportSummary()}

			{localModsDontExists.length > 0 && (
				<p className="text-red-500 text-sm pt-2">
					There are some local mods that could not be found in your
					system, if you continue anyways they will be ignored.
				</p>
			)}

			{nexusModsDontExists.length > 0 && (
				<p className="text-purple-500 text-sm border-t pt-2">
					There are some nexus mods that could not be found in your
					system, you may view them in the list and install them
					manually afterwards import button should be enabled.
				</p>
			)}

			<Button
				variant="success"
				size="sm"
				className={`${
					!profileExportData ||
					importLoading ||
					importProcessLoading ||
					nexusModsDontExists.length > 0
						? 'disabled'
						: ''
				}`}
				disabled={
					!profileExportData ||
					importLoading ||
					importProcessLoading ||
					nexusModsDontExists.length > 0
				}
				onClick={handleImportProcess}
			>
				<DownloadIcon />
				Import
				{importProcessLoading && <Loading />}
			</Button>
		</div>
	);
};
