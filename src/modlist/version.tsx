import { memo, useEffect } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { TableHead } from '@/components/table';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { ModVersionItem, modVersionStore } from '@/lib/store/mod_version';

export const THVersion = memo(() => {
	const selectedGame = settingStore(state => state.selectedGame);
	const toggle_version = settingStore(state => state.toggle_version);
	const sort_by = settingStore(state => state.sort_by);
	const sort_by_direction = settingStore(state => state.sort_by_direction);

	const mods = modsStore(state => state.mods);

	const changedMods = modVersionStore(state => state.changedMods);
	const setChangedMods = modVersionStore(state => state.setChangedMods);
	const modVersionData = modVersionStore(state => state.data);
	const setVersionData = modVersionStore(state => state.setData);
	const toggleVersionInfo = modVersionStore(state => state.toggleVersionInfo);

	useEffect(() => {
		if (modVersionData.length > 0) {
			const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
			const now = Date.now();
			let updatedModVersionData = [...modVersionData];
			let changed = [];

			const fetchModDetails = async (mv: ModVersionItem, vi: number) => {
				const modDetails = mods.find(
					m => m.identifier === mv.mod_id,
				) as ModItem;
				if (
					modDetails &&
					typeof modDetails.url === 'string' &&
					modDetails.url.length > 0 &&
					modDetails.url.startsWith('https://www.nexusmods.com')
				) {
					const modNexusId = modDetails.url.split('/').pop();
					if (modNexusId) {
						try {
							const nexusModDetail = await api.nexus_mod_details({
								game_domain_name: selectedGame!.nexus_slug,
								mod_id: Number(modNexusId),
							});
							console.log(nexusModDetail, 'nexusModDetail');
							updatedModVersionData[vi].last_time_checked =
								Date.now();
							if (mv.latest_version !== nexusModDetail.version) {
								updatedModVersionData[vi].latest_version =
									nexusModDetail.version;
								mv.latest_version = nexusModDetail.version;
								changed.push(mv);
							}
						} catch (_e) {}
					}
				}
			};

			let updated = false;
			for (let vi = 0; vi < modVersionData.length; vi++) {
				const mv = modVersionData[vi];
				switch (mv.mod_type) {
					case 'steam_mod':
					case 'local_mod':
						if (mv.version !== mv.latest_version) {
							changed.push(mv);
						}
						break;
					case 'nexus_mod':
						const timeSinceCheck = now - mv.last_time_checked;
						if (timeSinceCheck > ONE_WEEK_IN_MS) {
							// Only check if more than 1 week has passed since the last check
							fetchModDetails(mv, vi);
							updated = true;
						} else if (mv.latest_version !== mv.version) {
							changed.push(mv);
						}
						break;
					default:
						break;
				}
			}

			if (updated) {
				setVersionData(updatedModVersionData);
			}

			setChangedMods(changed);
		}
	}, [modVersionData, selectedGame!.steam_id]);

	if (!toggle_version) return null;
	return (
		<TableHead>
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
		</TableHead>
	);
});
