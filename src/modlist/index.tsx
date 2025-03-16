import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { modsStore } from '@/lib/store/mods';
import { ModOrderModel, modOrderStore } from '@/lib/store/mod_order';
import {
	ModActivationModel,
	modActivationStore,
} from '@/lib/store/mod_activation';
import {
	ModSeparatorModel,
	modSeparatorStore,
} from '@/lib/store/mod_separator';
import { ModMetaModel, modMetaStore } from '@/lib/store/mod_meta';
import { conflictsStore } from '@/lib/store/conflict';

import api, { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { normalizeOrder, toastError } from '@/lib/utils';

import { ModListTable } from './table';
import { isSeparator } from './utils';

export const ModList = () => {
	const [fetchModsLoading, setFetchModsLoading] = useState(false);

	const setMods = modsStore(state => state.setMods);
	const setModOrder = modOrderStore(state => state.setData);
	const setModActivation = modActivationStore(state => state.setData);
	const setSeparators = modSeparatorStore(state => state.setData);
	const setMetas = modMetaStore(state => state.setData);
	const setConflicts = conflictsStore(state => state.setConflicts);
	const profile = profileStore(state => state.profile);

	const init_reload = settingStore(state => state.init_reload);
	const setLoading = settingStore(state => state.setLoading);
	const selectedGame = settingStore(state => state.selectedGame);
	const steam_library_paths = settingStore(
		state => state.steam_library_paths,
	);
	const mod_installation_path = settingStore(
		state => state.mod_installation_path,
	);

	// Set up sensors for drag and drop
	const init = useCallback(async () => {
		const resolveOrder = async (mods: ModItemSeparatorUnion[]) => {
			const modOrder = await ModOrderModel.retrieve(profile.id);
			if (typeof modOrder !== 'undefined' && modOrder.data !== null) {
				let updatedOrder = [];
				const toAdd = [];
				for (let mi = 0; mi < mods.length; mi++) {
					const mod = mods[mi];
					const currentOrder = modOrder.data.find(
						f => f.mod_id === mod.identifier,
					);

					if (currentOrder) {
						updatedOrder.push({
							mod_id: mod.identifier,
							order: currentOrder.order,
							pack_file_path:
								'pack_file_path' in mod
									? mod.pack_file_path
									: undefined,
							title: mod.title,
						});
					} else {
						toAdd.push({
							mod_id: mod.identifier,
							order: 0,
							pack_file_path:
								'pack_file_path' in mod
									? mod.pack_file_path
									: undefined,
							title: mod.title,
						});
					}
				}

				updatedOrder = normalizeOrder(updatedOrder);
				let updatedOrderLength = updatedOrder.length;
				for (let tai = 0; tai < toAdd.length; tai++) {
					updatedOrderLength++;
					toAdd[tai].order = updatedOrderLength;
				}

				updatedOrder = normalizeOrder([...updatedOrder, ...toAdd]);
				return updatedOrder;
			} else {
				const newOrder = [];
				for (let mi = 0; mi < mods.length; mi++) {
					const mod = mods[mi];
					newOrder.push({
						mod_id: mod.identifier,
						order: mi + 1,
						pack_file_path:
							'pack_file_path' in mod
								? mod.pack_file_path
								: undefined,
						title: mod.title,
					});
				}
				const newModOrder = new ModOrderModel({
					id: null as any,
					profile_id: profile.id,
					app_id: selectedGame!.steam_id,
					data: newOrder,
				});
				await newModOrder.save();
				return newOrder;
			}
		};

		const resolveActivation = async (mods: ModItemSeparatorUnion[]) => {
			const modActivation = await ModActivationModel.retrieve(profile.id);
			if (
				typeof modActivation !== 'undefined' &&
				modActivation.data !== null
			) {
				let updatedActivation = [];
				const toAdd = [];
				for (let mi = 0; mi < mods.length; mi++) {
					const mod = mods[mi];
					const currentActivation = modActivation.data.find(
						f => f.mod_id === mod.identifier,
					);
					if (currentActivation) {
						updatedActivation.push({
							mod_id: mod.identifier,
							is_active: currentActivation.is_active,
							title: mod.title,
						});
					} else {
						toAdd.push({
							mod_id: mod.identifier,
							is_active: false,
							title: mod.title,
						});
					}
				}

				for (let tai = 0; tai < toAdd.length; tai++) {
					toAdd[tai].is_active = false;
				}

				updatedActivation = [...updatedActivation, ...toAdd];
				return updatedActivation;
			} else {
				const newActivation = [];
				for (let mi = 0; mi < mods.length; mi++) {
					const mod = mods[mi];
					newActivation.push({
						mod_id: mod.identifier,
						is_active: true,
						title: mod.title,
					});
				}
				const newModActivation = new ModActivationModel({
					id: null as any,
					profile_id: profile.id,
					app_id: selectedGame!.steam_id,
					data: newActivation,
				});
				await newModActivation.save();
				return newActivation;
			}
		};

		const resolveSeparator = async () => {
			const modSeparator = await ModSeparatorModel.retrieve(profile.id);
			if (
				typeof modSeparator !== 'undefined' &&
				modSeparator.data !== null
			) {
				return modSeparator.data;
			} else {
				const newModSeparator = new ModSeparatorModel({
					id: null as any,
					profile_id: profile.id,
					app_id: selectedGame!.steam_id,
					data: [],
				});
				await newModSeparator.save();
				return [];
			}
		};

		const resolveMeta = async (mods: ModItemSeparatorUnion[]) => {
			const modMeta = await ModMetaModel.retrieve(
				undefined,
				selectedGame!.steam_id,
			);
			if (typeof modMeta !== 'undefined' && modMeta.data !== null) {
				let updatedMeta = [];
				for (let mi = 0; mi < mods.length; mi++) {
					const mod = mods[mi] as ModItem;
					if (isSeparator(mod)) continue;

					const currentMeta = modMeta.data.find(
						f => f.mod_id === mod.identifier,
					);
					if (currentMeta) {
						updatedMeta.push({
							mod_id: mod.identifier,
							title: currentMeta.title,
							categories: currentMeta.categories,
							version: currentMeta.version,
						});
					} else {
						updatedMeta.push({
							mod_id: mod.identifier,
							title: '',
							categories: '',
							version: '',
						});
					}
				}

				return updatedMeta;
			} else {
				const newMeta = [];
				for (let mi = 0; mi < mods.length; mi++) {
					const mod = mods[mi] as ModItem;
					if (isSeparator(mod)) continue;

					newMeta.push({
						mod_id: mod.identifier,
						title: '',
						categories: '',
						version: '',
					});
				}
				const newModMeta = new ModMetaModel({
					id: null as any,
					app_id: selectedGame!.steam_id,
					data: newMeta,
				});
				await newModMeta.save();
				return newMeta;
			}
		};

		try {
			setFetchModsLoading(true);
			setLoading(true);
			let mods: ModItemSeparatorUnion[] = await api.get_mods(
				selectedGame!.steam_id,
			);
			console.log(mods, 'mods');
			const separators = await resolveSeparator();
			setSeparators(separators);
			mods = [...mods, ...separators];

			const modPaths = [
				`${mod_installation_path}\\${selectedGame!.steam_id}`,
				steam_library_paths.game_workshop_paths[selectedGame!.slug],
			];

			const conflicts = await api.pack_conflicts(modPaths);
			setConflicts(conflicts);

			const modOrder = await resolveOrder(mods);
			setModOrder(modOrder);
			const orderMap: Record<string, number> = modOrder.reduce(
				(acc: any, item: any) => {
					acc[item.mod_id] = item.order;
					return acc;
				},
				{} as Record<string, number>,
			);
			const sortedMods = [...mods].sort((a, b) => {
				return orderMap[a.identifier] - orderMap[b.identifier];
			});

			setMods(sortedMods);
			const modActivations = await resolveActivation(sortedMods);
			setModActivation(modActivations);

			const modMetaData = await resolveMeta(sortedMods);
			setMetas(modMetaData);
		} catch (error) {
			toastError(error);
		} finally {
			setFetchModsLoading(false);
			setLoading(false);
		}
	}, [selectedGame!.steam_id, init_reload]);

	useEffect(() => {
		init();
	}, [init]);

	if (fetchModsLoading) return <Loading />;

	return <ModListTable />;
};
