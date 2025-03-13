import { useState } from 'react';
import { toast } from 'sonner';

import { NativeFileInput } from '@/components/native-file-input';
import { DialogFooter } from '@/components/dialog';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { ProfileModel, profileStore } from '@/lib/store/profile';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModActivationModel } from '@/lib/store/mod_activation';
import { ModMetaModel } from '@/lib/store/mod_meta';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';

export function ImportData() {
	const [loading, setLoading] = useState(false);
	const [configJSONPath, setConfigJSONPath] = useState('');

	const games = settingStore(state => state.games);
	const profiles = profileStore(state => state.profiles);

	async function handleSubmit() {
		if (
			typeof configJSONPath === 'undefined' ||
			configJSONPath === null ||
			configJSONPath === ''
		)
			return;

		setLoading(true);
		try {
			const result = await api.import_data(configJSONPath);

			const metaGameKeys = Object.keys(result.mod_meta_information);
			for (let mgki = 0; mgki < metaGameKeys.length; mgki++) {
				const gameKey = metaGameKeys[mgki];
				const game = games.find(g => g.schema_name === gameKey);
				if (!game) continue;

				let modMeta = await ModMetaModel.retrieve(
					undefined,
					game.steam_id,
				);
				if (!modMeta) {
					modMeta = new ModMetaModel({
						id: null as any,
						app_id: game.steam_id,
						data: [],
					});
					await modMeta.save();
				}

				if (typeof modMeta !== 'undefined' && modMeta !== null) {
					if (modMeta.data === null) {
						modMeta.data = [];
					}

					for (
						let mti = 0;
						mti < result.mod_meta_information[gameKey].length;
						mti++
					) {
						const item = result.mod_meta_information[gameKey][mti];
						if (
							typeof item.categories !== 'undefined' &&
							item.categories !== null &&
							item.categories !== ''
						) {
							const findIndex = modMeta.data!.findIndex(
								m => m.mod_id === item.identifier,
							);
							if (findIndex) {
								modMeta.data[findIndex].categories =
									item.categories;
							} else {
								modMeta.data.push({
									mod_id: item.identifier,
									title: item.name,
									categories: item.categories,
									version: '',
								});
							}
						}
					}

					await modMeta.save();
				}
			}

			const profileGameKeys = Object.keys(result.mod_profiles);
			for (let gki = 0; gki < profileGameKeys.length; gki++) {
				const gameKey = profileGameKeys[gki];
				const game = games.find(g => g.schema_name === gameKey);
				if (!game) continue;

				for (
					let pgi = 0;
					pgi < result.mod_profiles[gameKey].length;
					pgi++
				) {
					const oldProf = result.mod_profiles[gameKey][pgi];

					let sanitizedProfileName = oldProf.profile_name.trim();
					const findDuplicateName = profiles.find(
						p =>
							p.name === sanitizedProfileName &&
							p.app_id === game.steam_id,
					);
					if (findDuplicateName) {
						toast.warning(
							`Profile with name: ${sanitizedProfileName} already exists. Skipping...`,
						);
						continue;
					}

					const newProfile = new ProfileModel({
						id: undefined as any,
						name: sanitizedProfileName,
						app_id: game.steam_id,
						is_active: false,
					});
					await newProfile.save();

					const newModActivation = new ModActivationModel({
						id: undefined as any,
						profile_id: newProfile.id,
						app_id: game.steam_id,
						data: oldProf.mods.map(pm => {
							return {
								mod_id: pm.identifier,
								title: pm.title,
								is_active: pm.is_active,
							};
						}),
					});
					await newModActivation.save();

					const newModOrder = new ModOrderModel({
						id: undefined as any,
						profile_id: newProfile.id,
						app_id: game.steam_id,
						data: oldProf.mods.map((pr, pri) => {
							return {
								mod_id: pr.identifier,
								title: pr.title,
								pack_file_path: pr.pack_file_path,
								order: pri + 1,
							};
						}),
					});
					await newModOrder.save();
				}
			}

			toast.success('Import successfull.');
			setTimeout(() => {
				window.location.reload();
			}, 500);
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col text-sm font-bold mb-1">
				Import Data From: WH3-Mod-Manager
			</div>
			<p className="text-sm text-orange-500">Highly Experimental</p>
			<p className="text-sm text-muted-foreground">
				This process will import profiles and load order setup in
				WH3-Mod-Manager by parsing config.json file.
			</p>
			<p className="text-sm text-muted-foreground">
				If you have any local mods installed they will be also processed
				to be compatible with this app's structure. While doing so
				process will copy the .pack files into the defined mods path in
				the settings so make sure you have enough space in the disk,
				depending on how much local mods you have this might take some
				time.
			</p>
			<NativeFileInput
				className="mt-3"
				dialogTitle="Select config.json"
				extensionFilter={['json']}
				onFileChange={file => {
					setConfigJSONPath(file.path);
					return true;
				}}
			/>

			<DialogFooter>
				<Button
					type="button"
					variant="info"
					className={
						loading || configJSONPath === '' ? 'disabled' : ''
					}
					disabled={loading || configJSONPath === ''}
					onClick={handleSubmit}
				>
					Save changes
					{loading && <Loading />}
				</Button>
			</DialogFooter>
		</div>
	);
}
