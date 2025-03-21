import { useState } from 'react';
import { FolderIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { Loading } from '@/components/loading';
import { Checkbox } from '@/components/checkbox';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modActivationStore } from '@/lib/store/mod_activation';
import {
	modSeparatorStore,
	isSeparator,
	getChildMods,
} from '@/lib/store/mod_separator';
import { modMetaStore } from '@/lib/store/mod_meta';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';

export const ExportProfile = () => {
	const [onlyActiveMods, setOnlyActiveMods] = useState(false);
	const [exportLoading, setExportLoading] = useState(false);
	const [exportPath, setExportPath] = useState('');

	const selectedGame = settingStore(state => state.selectedGame);
	const profile = profileStore(state => state.profile);
	const mods = modsStore(state => state.mods);
	const modOrderData = modOrderStore(state => state.data);
	const modActivationData = modActivationStore(state => state.data);
	const modMetaData = modMetaStore(state => state.data);
	const modSeparatorData = modSeparatorStore(state => state.data);

	const handleExport = async () => {
		if (profile.name === 'Default') {
			toast.error('Default profile cannot be exported.');
			return;
		}

		setExportLoading(true);
		try {
			let modsToExport = mods.filter(mod => !isSeparator(mod));
			let modOrderDataToExport = modOrderData;
			let modActivationDataToExport = modActivationData;
			let modMetaToExport = modMetaData;
			let separatorsToExport = modSeparatorData;
			if (onlyActiveMods) {
				modsToExport = modsToExport.filter(
					mod =>
						modActivationData.find(
							ma => ma.mod_id === mod.identifier,
						)?.is_active,
				);

				modMetaToExport = modMetaToExport.filter(
					mt =>
						modActivationData.find(ma => ma.mod_id === mt.mod_id)
							?.is_active,
				);

				separatorsToExport = separatorsToExport.filter(mod => {
					const childMods = getChildMods(mods, mod.identifier).filter(
						m =>
							modActivationData.find(
								ma =>
									ma.mod_id === m.identifier && ma.is_active,
							),
					);
					return childMods.length > 0;
				});

				modOrderDataToExport = modOrderData.filter(
					mr =>
						modActivationData.find(ma => ma.mod_id === mr.mod_id)
							?.is_active ||
						separatorsToExport.find(
							ss => ss.identifier === mr.mod_id,
						),
				);

				modActivationDataToExport = modActivationData.filter(
					ma => ma.is_active,
				);
			}

			const exportData = {
				app_id: selectedGame!.steam_id,
				name: profile.name,
				mods: modsToExport,
				mod_order: modOrderDataToExport,
				mod_activation: modActivationDataToExport,
				mod_meta: modMetaToExport,
				mod_separators: separatorsToExport,
			};
			const export_file_path = await api.export_profile(
				selectedGame!.steam_id,
				profile.id,
				profile.name,
				JSON.stringify(exportData),
			);

			setExportPath(export_file_path);
			toast.success(`Profile exported. Path: ${export_file_path}`);
		} catch (error) {
			toastError(error);
		} finally {
			setExportLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-between items-center gap-2">
				<Button
					className={`flex-grow ${
						exportLoading === true || profile.name === 'Default'
							? 'disabled'
							: ''
					}`}
					variant="success"
					disabled={exportLoading || profile.name === 'Default'}
					onClick={handleExport}
				>
					<UploadIcon />
					Export
					{exportLoading && <Loading />}
				</Button>
				<Button
					variant="secondary"
					className={`${exportPath === '' ? 'disabled' : ''}`}
					disabled={exportPath === ''}
					onClick={() => api.highlight_path(exportPath)}
				>
					<FolderIcon />
					View
				</Button>
			</div>

			<div className="flex items-center space-x-2">
				<Checkbox
					id="onlyActiveMods"
					checked={onlyActiveMods}
					onCheckedChange={isChecked =>
						setOnlyActiveMods(isChecked as any)
					}
				/>
				<label
					htmlFor="onlyActiveMods"
					className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Ignore Passive Mods
				</label>
			</div>

			{profile.name === 'Default' && (
				<p className="text-red-500">
					Default profile cannot be exported. You may create a
					duplicate profile with a different name and export that
					instead.
				</p>
			)}
			<p className="text-sm">
				This process will create a .json file that contains the current
				profile's data in a folder which you can view by clicking the
				button next to export.
			</p>
		</div>
	);
};
