import { memo, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { ModVersionItem, modVersionStore } from '@/lib/store/mod_version';

export const THVersion = memo(() => {
	const { selectedGame, toggle_version, sort_by, sort_by_direction } =
		settingStore(
			useShallow(state => ({
				selectedGame: state.selectedGame,
				toggle_version: state.toggle_version,
				sort_by: state.sort_by,
				sort_by_direction: state.sort_by_direction,
			})),
		);

	const mods = modsStore(state => state.mods);

	const {
		changedMods,
		setChangedMods,
		modVersionData,
		setVersionData,
		toggleVersionInfo,
	} = modVersionStore(
		useShallow(state => ({
			changedMods: state.changedMods,
			setChangedMods: state.setChangedMods,
			modVersionData: state.data,
			setVersionData: state.setData,
			toggleVersionInfo: state.toggleVersionInfo,
		})),
	);

	const fetchModDetails = useCallback(
		async (
			mv: ModVersionItem,
			vi: number,
			updatedModVersionData: ModVersionItem[],
			changed: ModVersionItem[],
			now: number,
		) => {
			const modDetails = mods.find(
				m => m.identifier === mv.mod_id,
			) as ModItem;
			if (
				typeof modDetails !== 'undefined' &&
				typeof modDetails.url !== 'undefined' &&
				modDetails.url?.length > 0 &&
				modDetails.url.startsWith('https://www.nexusmods.com')
			) {
				const modNexusId = modDetails.url.split('/').pop();
				if (modNexusId) {
					try {
						const nexusModDetail = await api.nexus_mod_details({
							game_domain_name: selectedGame!.nexus_slug,
							mod_id: Number(modNexusId),
						});

						if (
							updatedModVersionData[vi].last_time_checked !==
								now ||
							updatedModVersionData[vi].latest_version !==
								nexusModDetail.version
						) {
							updatedModVersionData[vi].last_time_checked = now;
							updatedModVersionData[vi].latest_version =
								nexusModDetail.version;

							if (mv.latest_version !== nexusModDetail.version) {
								changed.push({
									...mv,
									latest_version: nexusModDetail.version,
								});
							}
							return true;
						}
					} catch (_e) {}
				}
			}
			return false;
		},
		[mods, selectedGame!.steam_id],
	);

	useEffect(() => {
		if (modVersionData.length > 0) {
			const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
			const now = Date.now();
			let changed = [];
			let needsUpdate = false;

			for (let vi = 0; vi < modVersionData.length; vi++) {
				const mv = modVersionData[vi];
				switch (mv.mod_type) {
					case 'steam_mod':
						if (mv.version !== mv.latest_version) {
							changed.push({
								...mv,
								url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mv.mod_id}`,
							});
						}
						break;
					case 'local_mod':
						if (mv.version !== mv.latest_version) {
							changed.push(mv);
						}
						break;
					case 'nexus_mod':
						const timeSinceCheck = now - mv.last_time_checked;
						if (timeSinceCheck > ONE_WEEK_IN_MS) {
							// Only check if more than 1 week has passed since the last check
							fetchModDetails(
								mv,
								vi,
								modVersionData,
								changed,
								now,
							);
						} else if (mv.latest_version !== mv.version) {
							changed.push(mv);
						}
						break;
					default:
						break;
				}
			}

			if (needsUpdate) {
				setVersionData(modVersionData);
			}

			setChangedMods(changed);
		}
	}, [modVersionData, selectedGame!.steam_id]);

	if (!toggle_version) return null;
	return (
		<div
			className="flex items-center gap-1 hover:brightness-125 hover:cursor-pointer"
			onClick={() =>
				changedMods.length > 0 ? toggleVersionInfo(true) : null
			}
		>
			VERSION
			{changedMods.length > 0 && (
				<span className="flex items-center justify-center ms-1 mt-0 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] leading-none">
					{changedMods.length}
				</span>
			)}
			{sort_by === 'version' &&
				(sort_by_direction === 'asc' ? (
					<ArrowDownIcon className="w-4 h-4" />
				) : (
					<ArrowUpIcon className="w-4 h-4" />
				))}
		</div>
	);
});
