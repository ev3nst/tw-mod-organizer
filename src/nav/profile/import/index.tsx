import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';

import { type FileMeta, NativeFileInput } from '@/components/native-file-input';
import { Accordion } from '@/components/accordion';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
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
import { modMetaStore } from '@/lib/store/mod_meta';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';

import { Legend } from './legend';
import { Separators } from './separators';
import { Mods } from './mods';
import { Meta } from './meta';
import { SubscriptionErrorDialog } from './subscribe-error';

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

	const [subscriptionErrors, setSubscriptionErrors] = useState<
		Array<{
			title: string;
			id: string;
			error: string;
		}>
	>([]);
	const [showSubscriptionErrorDialog, setShowSubscriptionErrorDialog] =
		useState(false);
	const [pendingImportData, setPendingImportData] = useState<any>(null);

	const mods = modsStore(state => state.mods);
	const modMetaData = modMetaStore(state => state.data);
	const modsOnly = mods.filter(mod => !isSeparator(mod)) as ModItem[];

	const { games, setLockScreen } = settingStore(
		useShallow(state => ({
			setIsGameLoading: state.setIsGameLoading,
			games: state.games,
			setLockScreen: state.setLockScreen,
		})),
	);

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
				pm.item_type === 'steam_mod' &&
				modsOnly.some(mo => mo.mod_file === pm.mod_file),
		);

		steamModDontExists = profileExportData.mods.filter(
			pm =>
				pm.item_type === 'steam_mod' &&
				!modsOnly.some(mo => mo.mod_file === pm.mod_file),
		);

		localModsExists = profileExportData.mods.filter(
			pm =>
				pm.item_type === 'local_mod' &&
				(modsOnly.some(mo => mo.mod_file === pm.mod_file) ||
					modMetaData.some(me => me.title === pm.mod_file)),
		);

		localModsDontExists = profileExportData.mods.filter(
			pm =>
				pm.item_type === 'local_mod' &&
				!modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				!modMetaData.some(me => me.title === pm.mod_file),
		);

		nexusModsExists = profileExportData.mods.filter(
			pm =>
				pm.item_type === 'nexus_mod' &&
				(modsOnly.some(mo => mo.mod_file === pm.mod_file) ||
					modMetaData.some(me => me.title === pm.mod_file)),
		);

		nexusModsDontExists = profileExportData.mods.filter(
			pm =>
				pm.item_type === 'nexus_mod' &&
				!modsOnly.some(mo => mo.mod_file === pm.mod_file) &&
				!modMetaData.some(me => me.title === pm.mod_file),
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

	const subscribeToMods = async () => {
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
		setSubscriptionErrors([]);

		const errors: Array<{
			title: string;
			id: string;
			error: string;
		}> = [];

		for (let mi = 0; mi < profileExportData.mods.length; mi++) {
			const mod = profileExportData.mods[mi];
			if (
				mod.item_type === 'steam_mod' &&
				!modsOnly.some(mo => mo.identifier === mod.identifier)
			) {
				try {
					await api.subscribe(
						profileExportData.app_id,
						Number(mod.identifier),
					);
					setDidInstallNewMods(true);
				} catch (error) {
					console.log('Error subscribing to mod:', mod);
					console.error(error);
					let errorMessage = 'Unknown error occurred';
					if (error instanceof Error) {
						errorMessage = error.message;
					} else if (typeof error === 'string') {
						errorMessage = error;
					} else if (typeof error === 'object' && error !== null) {
						errorMessage = JSON.stringify(error);
					}

					errors.push({
						title: mod.title || `Mod ID: ${mod.identifier}`,
						id: mod.identifier,
						error: errorMessage,
					});
				}
			}
		}

		if (errors.length > 0) {
			setSubscriptionErrors(errors);
			setShowSubscriptionErrorDialog(true);

			const importData = await prepareImportData();
			setPendingImportData(importData);
		} else {
			const importData = await prepareImportData();
			await finalizeImport(importData);
		}

		if (errors.length === 0) {
			setImportProcessLoading(false);
		}
	};

	const prepareImportData = async () => {
		if (!profileExportData) return null;

		const newProfileName =
			importProfileName !== ''
				? importProfileName
				: profileExportData.name.trim();
		const profiles = await ProfileModel.all(profileExportData.app_id);
		const existing = profiles.find(
			p => p.name.toLowerCase() === newProfileName.toLowerCase(),
		);

		const importedModFiles = new Set(
			profileExportData.mods.map(m => m.mod_file),
		);
		const unrelatedMods = modsOnly.filter(
			mod => !importedModFiles.has(mod.mod_file),
		);

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

		const maxOrder =
			resolvedModOrder.length > 0
				? Math.max(...resolvedModOrder.map(mo => mo.order))
				: 0;

		let othersSeparatorTitle = 'Others';

		const existingSeparators = profileExportData.mod_separators || [];
		const existingOtherSeparators = existingSeparators
			.filter(sep => sep.title.startsWith('Others'))
			.map(sep => sep.title);

		if (existingOtherSeparators.includes('Others')) {
			let counter = 2;
			while (existingOtherSeparators.includes(`Others - ${counter}`)) {
				counter++;
			}
			othersSeparatorTitle = `Others - ${counter}`;
		}

		let updatedModOrder = [...resolvedModOrder];
		let updatedSeparators = [...profileExportData.mod_separators];

		if (unrelatedMods.length > 0) {
			const othersSeparator = {
				identifier: `separator_${Date.now()}`,
				title: othersSeparatorTitle,
				background_color: '#3a3a3c',
				text_color: '#ffffff',
				type: 'separator',
				order: maxOrder + 1,
				collapsed: true,
			};

			updatedSeparators.push(othersSeparator);

			updatedModOrder.push({
				mod_id: othersSeparator.identifier,
				title: othersSeparator.title,
				order: maxOrder + 1,
			});

			unrelatedMods.forEach((mod, index) => {
				updatedModOrder.push({
					mod_id: mod.identifier,
					title: mod.title,
					order: maxOrder + 2 + index,
				});
			});
		}

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

		const updatedModActivation = [...resolvedModActivation];
		if (unrelatedMods.length > 0) {
			unrelatedMods.forEach(mod => {
				updatedModActivation.push({
					mod_id: mod.identifier,
					is_active: false,
					title: mod.title,
				});
			});
		}

		return {
			existing,
			newProfileName,
			updatedModOrder,
			updatedSeparators,
			updatedModActivation,
		};
	};

	const finalizeImport = async (importData: any) => {
		if (!importData || !profileExportData) return;

		try {
			const {
				existing,
				newProfileName,
				updatedModOrder,
				updatedSeparators,
				updatedModActivation,
			} = importData;

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

			const newModOrder = new ModOrderModel({
				id: undefined as any,
				app_id: profileExportData.app_id,
				profile_id: newProfile.id,
				data: updatedModOrder,
			});
			await newModOrder.save();

			const newModActivation = new ModActivationModel({
				id: undefined as any,
				app_id: profileExportData.app_id,
				profile_id: newProfile.id,
				data: updatedModActivation,
			});
			await newModActivation.save();

			const newSeparators = new ModSeparatorModel({
				id: undefined as any,
				app_id: profileExportData.app_id,
				profile_id: newProfile.id,
				data: updatedSeparators,
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

	const handleContinueWithErrors = async () => {
		setShowSubscriptionErrorDialog(false);

		if (pendingImportData) {
			await finalizeImport(pendingImportData);
			setPendingImportData(null);
		}
	};

	const handleAbortImport = () => {
		setShowSubscriptionErrorDialog(false);
		setImportProcessLoading(false);
		setPendingImportData(null);
		toast.error('Import aborted due to subscription errors.');
	};

	useEffect(() => {
		if (importFile?.path) {
			handleImportFileChange(importFile);
		}
	}, [importFile]);

	const handleRemoveMod = (mod: ModItem) => {
		setProfileExportData(prevData => ({
			...prevData!,
			mods: prevData!.mods.filter(m => m.identifier !== mod.identifier),
		}));
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
			<div className="flex max-h-[400px] flex-col gap-3 overflow-y-auto">
				<div className="mb-2">
					<div className="flex items-center gap-2">
						<div className="font-bold">Import Details:</div>
						{(steamModDontExists.length > 0 ||
							localModsDontExists.length > 0 ||
							nexusModsDontExists.length > 0) && (
							<Legend
								localModsDontExists={localModsDontExists.length}
								nexusModsDontExists={nexusModsDontExists.length}
							/>
						)}
					</div>
				</div>

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
					<p className="text-sm text-red-500">
						A profile with same name exists, existing one will be
						deleted before import unless you change it to something
						else.
					</p>
				)}

				<Accordion type="single" collapsible className="w-full">
					<Mods
						steamModExists={steamModExists}
						steamModDontExists={steamModDontExists}
						nexusModsExists={nexusModsExists}
						nexusModsDontExists={nexusModsDontExists}
						localModsExists={localModsExists}
						localModsDontExists={localModsDontExists}
						profileExportMods={profileExportData.mods}
						modsOnly={modsOnly}
						modMetaData={modMetaData}
						onRemoveMod={handleRemoveMod}
					/>
					<Separators data={profileExportData.mod_separators} />
					<Meta
						copyMeta={copyMeta}
						setCopyMeta={setCopyMeta}
						profileModMeta={profileExportData.mod_meta}
						profileExportMods={profileExportData.mods}
					/>
				</Accordion>
			</div>
		);
	};

	if (isImportComplete) {
		if (didInstallNewMods) {
			setLockScreen(true);
			return (
				<div className="z-10 flex flex-col gap-2 bg-background text-lg">
					<p className="text-green-500">
						Import Process within App is complete.
					</p>
					<p className="text-orange-500">
						You should close this application and wait for downloads
						to complete within Steam Client and than re-open the mod
						manager.
					</p>
					<p className="text-orange-500">
						It is also recommended to verify the game files after
						the download is complete.
					</p>
					<Button
						variant="destructive"
						size="sm"
						className="w-full"
						onClick={() => {
							setLockScreen(false);
							window.location.reload();
						}}
					>
						Close Application
					</Button>
				</div>
			);
		} else {
			setTimeout(() => {
				window.location.reload();
			}, 150);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<NativeFileInput
					key={importFile?.path ?? 'import-profile-file-input'}
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
				onClick={subscribeToMods}
			>
				<DownloadIcon />
				Import
				{importProcessLoading && <Loading />}
			</Button>

			<SubscriptionErrorDialog
				open={showSubscriptionErrorDialog}
				onOpenChange={setShowSubscriptionErrorDialog}
				erroredMods={subscriptionErrors}
				onContinue={handleContinueWithErrors}
				onAbort={handleAbortImport}
			/>
		</div>
	);
};
