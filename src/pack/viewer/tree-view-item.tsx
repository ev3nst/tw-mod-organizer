import { useEffect, useState } from 'react';
import {
	BoxIcon,
	BracesIcon,
	ChevronDownIcon,
	CircleHelpIcon,
	ClapperboardIcon,
	CodeIcon,
	DatabaseIcon,
	FolderIcon,
	GemIcon,
	ImageIcon,
	TypeIcon,
} from 'lucide-react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/collapsible';
import { Button } from '@/components/button';
import {
	getParentPaths,
	packManagerStore,
	TreeItem,
} from '@/lib/store/pack-manager';

export function TreeViewItem({
	item,
	level = 0,
}: {
	item: TreeItem;
	level?: number;
}) {
	const [isOpen, setIsOpen] = useState(false);

	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);
	const setSelectedTreeItem = packManagerStore(
		state => state.setSelectedTreeItem,
	);

	const hasChildren = (item.children && item.children.length > 0) || false;
	const preview_local =
		'preview_local' in item ? item.preview_local : undefined;
	const preview_url = 'preview_url' in item ? item.preview_url : undefined;
	const imgSrc = preview_local !== '' ? preview_local : preview_url;

	useEffect(() => {
		if (selectedTreeItem) {
			const parentPaths = getParentPaths(selectedTreeItem.id);
			if (
				(parentPaths.includes(item.id) &&
					item.pack_file_name === selectedTreeItem.pack_file_name) ||
				(item.pack_file_name === selectedTreeItem.pack_file_name &&
					level === 0)
			) {
				setIsOpen(true);
			}
		}
	}, [selectedTreeItem?.id, item.id]);

	const renderItemIcon = (
		level: number,
		hasChildren: boolean,
		item: TreeItem,
	) => {
		if (!hasChildren) {
			if (item.id.startsWith('db/')) {
				return <DatabaseIcon className="mt-0.5 text-blue-500" />;
			}

			const idEndsWith = item.id.substring(item.id.lastIndexOf('.'));
			switch (idEndsWith) {
				case '.lua':
					return <CodeIcon className="mt-0.5 text-orange-500" />;
				case '.xml':
					return <CodeIcon className="mt-0.5 text-orange-500" />;
				case '.json':
					return <BracesIcon className="mt-0.5 text-orange-500" />;
				case '.png':
					return <ImageIcon className="mt-0.5 text-purple-500" />;
				case '.dds':
					return <ImageIcon className="mt-0.5 text-purple-500" />;
				case '.loc':
					return <TypeIcon className="mt-0.5 text-red-500" />;
				case '.variantmeshdefinition':
					return <BoxIcon className="mt-0.5 text-green-500" />;
				case '.material':
					return <GemIcon className="mt-0.5 text-green-500" />;
				case '.ca_vp8':
					return (
						<ClapperboardIcon className="mt-0.5 text-yellow-500" />
					);

				default:
					return <CircleHelpIcon className=" mt-0.5" />;
			}
		} else {
			if (level !== 0) {
				return <FolderIcon className="mt-0.5" />;
			}
		}
	};

	return (
		<div className={`relative ${level > 0 ? 'pl-4' : ''}`}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<Button
						variant="ghost"
						className={`h-auto max-h-12 min-h-8 w-full justify-between whitespace-normal break-all rounded-none px-1 text-left text-xs [&_svg]:size-3 ${
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
									className={`ms-1 size-6 select-none rounded-full object-cover`}
									src={imgSrc}
								/>
							)}

							{renderItemIcon(level, hasChildren, item)}

							{item.label}
						</div>

						{hasChildren && (
							<ChevronDownIcon
								className={`mr-1 transition-transform ${
									isOpen ? 'rotate-0' : '-rotate-90'
								}`}
							/>
						)}
					</Button>
				</CollapsibleTrigger>

				{hasChildren && (
					<CollapsibleContent className="relative ml-2 before:absolute before:inset-y-0 before:left-[10px] before:border-l before:border-secondary-border before:content-['']">
						{item.children!.map(child => (
							<TreeViewItem
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
