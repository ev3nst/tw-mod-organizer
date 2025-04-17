import { useEffect, useState } from 'react';
import {
	BoxIcon,
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
				parentPaths.includes(item.id) ||
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
				return <DatabaseIcon className="text-blue-500 mt-0.5" />;
			}

			const idEndsWith = item.id.substring(item.id.lastIndexOf('.'));
			switch (idEndsWith) {
				case '.lua':
					return <CodeIcon className="text-orange-500 mt-0.5" />;
				case '.png':
					return <ImageIcon className="text-purple-500 mt-0.5" />;
				case '.loc':
					return <TypeIcon className="text-red-500 mt-0.5" />;
				case '.variantmeshdefinition':
					return <BoxIcon className="text-green-500 mt-0.5" />;
				case '.material':
					return <GemIcon className="text-green-500 mt-0.5" />;
				case '.ca_vp8':
					return (
						<ClapperboardIcon className="text-yellow-500 mt-0.5" />
					);

				default:
					return <CircleHelpIcon className=" mt-0.5" />;
					break;
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
									className={`object-cover ms-1 h-6 w-6 rounded-full select-none`}
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
					<CollapsibleContent className="ml-2 before:content-[''] before:absolute before:top-0 before:bottom-0 before:left-[10px] before:border-l before:border-secondary-border relative">
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
