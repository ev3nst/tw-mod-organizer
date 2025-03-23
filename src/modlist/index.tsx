import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modActivationStore } from '@/lib/store/mod_activation';
import {
	modSeparatorStore,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { modMetaStore } from '@/lib/store/mod_meta';
import { conflictsStore } from '@/lib/store/conflict';

import api from '@/lib/api';
import { normalizeOrder, toastError } from '@/lib/utils';

import { ModListSortableTable } from './sortable-table';
import { initActivation, initMeta, initOrder, initSeparator } from './utils';

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
	const sort_by = settingStore(state => state.sort_by);

	const init = useCallback(async () => {
		try {
			setFetchModsLoading(true);
			setLoading(true);
			const mods = await api.get_mods(selectedGame!.steam_id);
			const separators = await initSeparator(
				selectedGame!.steam_id,
				profile.id,
			);
			setSeparators(separators);
			const modsWithSeparators = [...mods, ...separators];

			const modPaths = [
				`${mod_installation_path}\\${selectedGame!.steam_id}`,
				steam_library_paths.game_workshop_paths[selectedGame!.slug],
			];

			const conflicts = await api.conflicts(
				selectedGame!.steam_id,
				modPaths,
			);
			setConflicts(conflicts);

			const currentModOrder = modOrderStore.getState().data;
			const modOrder = await initOrder(
				selectedGame!.steam_id,
				profile.id,
				modsWithSeparators,
			);

			const existingModIds = new Set(modOrder.map(item => item.mod_id));
			const missingItems = currentModOrder.filter(
				item => !existingModIds.has(item.mod_id),
			);

			let finalModOrder = modOrder;

			if (missingItems.length > 0) {
				const highestOrder = Math.max(
					...modOrder.map(item => item.order),
					0,
				);

				missingItems.forEach((item, idx) => {
					item.order = highestOrder + idx + 1;
				});

				finalModOrder = normalizeOrder([...modOrder, ...missingItems]);
			}

			setModOrder(finalModOrder);

			let sortedMods: ModItemSeparatorUnion[] = [];
			switch (sort_by) {
				case 'load_order':
					const orderMap: Record<string, number> = modOrder.reduce(
						(acc: any, item: any) => {
							acc[item.mod_id] = item.order;
							return acc;
						},
						{} as Record<string, number>,
					);
					sortedMods = [...modsWithSeparators].sort((a, b) => {
						return orderMap[a.identifier] - orderMap[b.identifier];
					});
					break;
				case 'title':
					sortedMods = [...mods].sort((a, b) =>
						a.title
							.toLowerCase()
							.localeCompare(b.title.toLowerCase()),
					);
					break;
				case 'version':
					sortedMods = [...mods].sort((a, b) => {
						const numA = parseFloat(a.version as string);
						const numB = parseFloat(b.version as string);

						if (!isNaN(numA) && !isNaN(numB)) {
							return numA - numB;
						}

						if (!isNaN(numA)) return -1;
						if (!isNaN(numB)) return 1;

						return 0;
					});
					break;

				default:
					break;
			}

			setMods(sortedMods);
			const modActivations = await initActivation(
				selectedGame!.steam_id,
				profile.id,
				sortedMods,
			);
			setModActivation(modActivations);

			const modMetaData = await initMeta(
				selectedGame!.steam_id,
				sortedMods,
			);
			setMetas(modMetaData);
		} catch (error) {
			toastError(error);
		} finally {
			setFetchModsLoading(false);
			setLoading(false);
		}
	}, [selectedGame!.steam_id, sort_by, init_reload]);

	useEffect(() => {
		init();
	}, [init]);

	if (fetchModsLoading) return <Loading />;

	return <ModListSortableTable />;
};
