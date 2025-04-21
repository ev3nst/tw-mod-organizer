import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';
import { Input } from '@/components/input';
import { Loading } from '@/components/loading';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';

import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { isSeparator } from '@/lib/store/mod_separator';
import {
	convertPackFilesToTree,
	packManagerStore,
} from '@/lib/store/pack-manager';
import { filterMods, modMetaStore } from '@/lib/store/mod_meta';
import { modActivationStore } from '@/lib/store/mod_activation';

import { TreeViewItem } from './tree-view-item';

export function TreeView() {
	const [treeDataLoading, setTreeDataLoading] = useState(true);

	const searchInputRef = useRef<HTMLInputElement>(null);
	const [searchModText, setSearchModText] = useState<string>('');
	const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
		setSearchModText(event.currentTarget.value);
	const [activationFilter, setActivationFilter] = useState<string>('all');

	const selectedGame = settingStore(state => state.selectedGame);

	const mods = modsStore(state => state.mods);
	const onlyMods = mods.filter(m => !isSeparator(m)) as ModItem[];
	const metaData = modMetaStore(state => state.data);
	const modActiveData = modActivationStore(state => state.data);

	const filteredMods = useMemo(() => {
		return filterMods(
			searchModText,
			activationFilter,
			onlyMods,
			metaData,
			modActiveData,
		) as ModItem[];
	}, [mods.length, searchModText, activationFilter]);

	const packTree = packManagerStore(state => state.packTree);
	const setPackTree = packManagerStore(state => state.setPackTree);
	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);
	const setSelectedTreeItemData = packManagerStore(
		state => state.setSelectedTreeItemData,
	);
	const selectedTreeItemDb = packManagerStore(
		state => state.selectedTreeItemDb,
	);
	const setSelectedTreeItemDb = packManagerStore(
		state => state.setSelectedTreeItemDb,
	);
	const selectedTreeItemLoc = packManagerStore(
		state => state.selectedTreeItemLoc,
	);
	const setSelectedTreeItemLoc = packManagerStore(
		state => state.setSelectedTreeItemLoc,
	);
	const setTreeItemDataLoading = packManagerStore(
		state => state.setTreeItemDataLoading,
	);

	useEffect(() => {
		async function fetchPackFiles() {
			const trees = await Promise.all(
				onlyMods.map(async mod => {
					const pack_files = await api.pack_files(mod.mod_file_path);
					return {
						id: mod.identifier,
						label: mod.title,
						pack_file_name: mod.mod_file,
						pack_file_path: mod.mod_file_path,
						preview_local: mod.preview_local,
						preview_url: mod.preview_url,
						children: convertPackFilesToTree(
							pack_files,
							undefined,
							{
								pack_file_name: mod.mod_file,
								pack_file_path: mod.mod_file_path,
							} as any,
						),
					};
				}),
			);

			setPackTree(trees);
			setTreeDataLoading(false);
		}

		fetchPackFiles();
	}, []);

	useEffect(() => {
		if (typeof selectedTreeItem !== 'undefined') {
			(async () => {
				setTreeItemDataLoading(true);
				try {
					if (selectedTreeItem.id.startsWith('db/')) {
						if (
							selectedTreeItemDb?.pack_file !==
							selectedTreeItem.pack_file_path
						) {
							const data = await api.pack_db_data(
								selectedGame!.steam_id,
								selectedTreeItem.pack_file_path,
							);
							setSelectedTreeItemDb({
								pack_file: selectedTreeItem.pack_file_path,
								data,
							});
						}
						setSelectedTreeItemData({
							type: 'db',
							content: selectedTreeItem.id,
						});
						return;
					}

					if (selectedTreeItem.id.endsWith('.loc')) {
						if (
							selectedTreeItemLoc?.pack_file !==
							selectedTreeItem.pack_file_path
						) {
							const data = await api.pack_loc_data(
								selectedGame!.steam_id,
								selectedTreeItem.pack_file_path,
							);
							setSelectedTreeItemLoc({
								pack_file: selectedTreeItem.pack_file_path,
								data,
							});
						}
						setSelectedTreeItemData({
							type: 'loc',
							content: selectedTreeItem.id,
						});
						return;
					}

					const data = await api.pack_fetch_data(
						selectedGame!.steam_id,
						selectedTreeItem.pack_file_path,
						selectedTreeItem.id,
					);
					setSelectedTreeItemData(data);
				} catch (error) {
					toastError(error);
				} finally {
					setTreeItemDataLoading(false);
				}
			})();
		}
	}, [selectedTreeItem?.id, selectedTreeItemDb?.pack_file]);

	const filteredPackTree = useMemo(() => {
		if (searchModText === '' && activationFilter === 'all') {
			return packTree;
		}

		const onlyPackNames = filteredMods.map(f => f.mod_file);
		return packTree.filter(item => {
			return onlyPackNames.indexOf(item.pack_file_name) !== -1;
		});
	}, [packTree.length, filteredMods.length, searchModText, activationFilter]);

	if (treeDataLoading) {
		return <Loading />;
	}

	return (
		<div>
			{filteredPackTree.map(item => (
				<TreeViewItem key={item.id} item={item} />
			))}
			<div className="flex items-center gap-2 sticky bottom-0 bg-secondary-bg w-full">
				<div>
					<Select
						value={activationFilter}
						onValueChange={setActivationFilter}
					>
						<SelectTrigger
							className="w-[70px] justify-center rounded-none h-full border-t-0 border-l-0 border-b-0 border-secondary-border"
							disableIcon
						>
							<SelectValue placeholder={activationFilter} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="passive">Passive</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="relative flex items-center justify-between w-full">
					<div className="flex-grow">
						<SearchIcon className="absolute bottom-[12px] w-3.5 h-3.5 text-muted-foreground" />
						<Input
							ref={searchInputRef}
							className="rounded-none ps-6 h-10 border-0"
							placeholder="C: Category (Optional) - Search Term ..."
							onChange={handleSearchChange}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
