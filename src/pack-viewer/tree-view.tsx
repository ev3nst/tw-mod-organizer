import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/collapsible';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { isSeparator } from '@/lib/store/mod_separator';
import { packManagerStore, TreeItem } from '@/lib/store/pack-manager';
import { toastError } from '@/lib/utils';

function convertPackFilesToTree(
	packFiles: Record<string, any>,
	parentPath: string = '',
	treeItem: TreeItem,
): TreeItem[] {
	const result: TreeItem[] = [];

	for (const [key, value] of Object.entries(packFiles)) {
		if (!value || typeof value !== 'object') continue;

		const currentPath = parentPath ? `${parentPath}/${key}` : key;
		const node: TreeItem = {
			id: currentPath,
			label: key,
			pack_file_name: treeItem.pack_file_name,
			pack_file_path: treeItem.pack_file_path,
			children: [],
		};

		if (Array.isArray(value)) {
			node.children = value.map((file: string) => ({
				id: `${currentPath}/${file}`,
				label: file,
				pack_file_name: treeItem.pack_file_name,
				pack_file_path: treeItem.pack_file_path,
			}));
		} else {
			if (typeof node.children === 'undefined') {
				node.children = [];
			}

			for (const [subKey, subValue] of Object.entries(value)) {
				const subNode = convertPackFilesToTree(
					{ [subKey]: subValue },
					currentPath,
					treeItem,
				);
				node.children.push(...subNode);
			}
		}

		result.push(node);
	}

	return result;
}

export function ModTree() {
	const [treeDataLoading, setTreeDataLoading] = useState(true);

	const selectedGame = settingStore(state => state.selectedGame);

	const mods = modsStore(state => state.mods);
	const packTree = packManagerStore(state => state.packTree);
	const setPackTree = packManagerStore(state => state.setPackTree);
	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);
	const setSelectedTreeItemData = packManagerStore(
		state => state.setSelectedTreeItemData,
	);
	const setTreeItemDataLoading = packManagerStore(
		state => state.setTreeItemDataLoading,
	);

	useEffect(() => {
		async function fetchPackFiles() {
			let onlyMods = mods.filter(m => !isSeparator(m)) as ModItem[];
			const tree = [];
			for (let mi = 0; mi < onlyMods.length; mi++) {
				const pack_files = await api.pack_files(
					onlyMods[mi].mod_file_path,
				);

				tree.push({
					id: onlyMods[mi].identifier,
					label: onlyMods[mi].title,
					pack_file_name: onlyMods[mi].mod_file,
					pack_file_path: onlyMods[mi].mod_file_path,
					preview_local: onlyMods[mi].preview_local,
					preview_url: onlyMods[mi].preview_url,
					children: convertPackFilesToTree(pack_files, undefined, {
						pack_file_name: onlyMods[mi].mod_file,
						pack_file_path: onlyMods[mi].mod_file_path,
					} as any),
				});
			}

			setPackTree(tree);
			setTreeDataLoading(false);
		}

		fetchPackFiles();
	}, [mods]);

	useEffect(() => {
		if (typeof selectedTreeItem !== 'undefined') {
			(async () => {
				setTreeItemDataLoading(true);
				try {
					const data = await api.pack_fetch_data(
						selectedGame!.steam_id,
						selectedTreeItem.pack_file_path,
						selectedTreeItem.id,
					);
					console.log(data, 'data');
					setSelectedTreeItemData(data);
				} catch (error) {
					toastError(error);
				} finally {
					setTreeItemDataLoading(false);
				}
			})();
		}
	}, [selectedTreeItem]);

	if (treeDataLoading) {
		return <Loading />;
	}

	return (
		<>
			{packTree.map(item => (
				<TreeView key={item.id} item={item} />
			))}
		</>
	);
}

function TreeView({ item, level = 0 }: { item: TreeItem; level?: number }) {
	const [isOpen, setIsOpen] = useState(false);

	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);
	const setSelectedTreeItem = packManagerStore(
		state => state.setSelectedTreeItem,
	);

	const hasChildren = item.children && item.children.length > 0;
	const preview_local =
		'preview_local' in item ? item.preview_local : undefined;
	const preview_url = 'preview_url' in item ? item.preview_url : undefined;
	const imgSrc = preview_local !== '' ? preview_local : preview_url;
	return (
		<div className={`relative ${level > 0 ? 'pl-4' : ''}`}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<Button
						variant="ghost"
						className={`w-full justify-between text-left rounded-none text-xs break-all whitespace-normal min-h-8 max-h-12 h-auto px-1 [&_svg]:size-3 ${
							level === 0 ? 'font-semibold' : ''
						} ${
							selectedTreeItem?.id === item.id
								? 'bg-secondary-bg'
								: ''
						}`}
						onClick={e => {
							if (!hasChildren) {
								e.stopPropagation();
								setSelectedTreeItem(item);
							}
						}}
					>
						<div
							className={`flex items-center gap-2 ${
								!imgSrc ? 'ml-2' : ''
							}`}
						>
							{imgSrc && (
								<img
									className={`object-cover h-6 w-6 rounded-full select-none`}
									src={imgSrc}
								/>
							)}

							{item.label}
						</div>

						{hasChildren && (
							<ChevronDown
								className={`mr-1 transition-transform ${
									isOpen ? 'rotate-0' : '-rotate-90'
								}`}
							/>
						)}
					</Button>
				</CollapsibleTrigger>

				{hasChildren && (
					<CollapsibleContent className="ml-2 before:content-[''] before:absolute before:top-0 before:bottom-0 before:left-[10px] before:border-l before:border-secondary-border relative">
						{item.children!.map(child => (
							<TreeView
								key={child.id}
								item={child}
								level={level + 1}
							/>
						))}
					</CollapsibleContent>
				)}
			</Collapsible>
		</div>
	);
}

export { TreeView };
