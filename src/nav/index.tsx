import { useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
	DatabaseZapIcon,
	ExternalLinkIcon,
	FileCode2Icon,
	FolderArchiveIcon,
	FolderTreeIcon,
} from 'lucide-react';

import { ProfileSwitcher } from '@/nav/profile';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { packManagerStore } from '@/lib/store/pack-manager';
import { cn } from '@/lib/utils';

export const AppNav = () => {
	const [wouterLocation] = useLocation();

	const selectedGame = settingStore(state => state.selectedGame);
	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);

	const handleOpenPackFile = useCallback(() => {
		if (selectedTreeItem?.pack_file_path) {
			api.open_pack_file(selectedTreeItem.pack_file_path);
		}
	}, [selectedTreeItem?.pack_file_path]);

	const toolbar = useMemo(() => {
		if (selectedGame?.type !== 'totalwar') return null;

		if (wouterLocation === '/pack-viewer') {
			return (
				<div className="flex items-baseline gap-2 ps-1">
					<div className="mx-1 shrink-0 font-bold">
						Selected File:
					</div>
					<div className="flex items-center gap-2 truncate font-semibold text-primary">
						{selectedTreeItem?.pack_file_name}
						{typeof selectedTreeItem?.pack_file_path ===
							'string' && (
							<div
								className="hover:cursor-pointer hover:brightness-125"
								onClick={handleOpenPackFile}
							>
								<ExternalLinkIcon className="size-4" />
							</div>
						)}
					</div>
					<div className="truncate text-sm italic text-primary">
						{selectedTreeItem?.id}
					</div>
				</div>
			);
		}
		return null;
	}, [
		wouterLocation,
		selectedGame?.type,
		selectedTreeItem,
		handleOpenPackFile,
	]);

	const navigationLinks = useMemo(
		() => (
			<div className="flex shrink-0 -space-x-px">
				<Link
					to="/"
					title="Mod List"
					className={cn(
						'flex items-center justify-center rounded-none border-x px-3 py-2 text-center text-sm shadow-none transition-colors last:border-r-0 hover:bg-secondary-bg focus-visible:z-10',
						wouterLocation === '/'
							? 'bg-secondary-bg'
							: 'text-muted-foreground',
					)}
				>
					<FolderArchiveIcon className="me-2 hidden size-3.5 sm:block" />
					Mod List
				</Link>
				{selectedGame?.type === 'totalwar' && (
					<>
						<Link
							to="/pack-viewer"
							title="Pack Viewer"
							className={cn(
								'flex items-center justify-center rounded-none border-x px-3 py-2 text-center text-sm shadow-none transition-colors last:border-r-0 hover:bg-secondary-bg focus-visible:z-10',
								wouterLocation === '/pack-viewer'
									? 'bg-secondary-bg'
									: 'text-muted-foreground',
							)}
						>
							<FileCode2Icon className="me-2 hidden size-3.5 sm:block" />
							Pack Viewer
						</Link>
						<Link
							to="/pack-files-tree"
							title="Pack Files Tree"
							className={cn(
								'hidden items-center justify-center rounded-none border-x px-3 py-2 text-center text-sm shadow-none transition-colors last:border-r-0 hover:bg-secondary-bg focus-visible:z-10',
								wouterLocation === '/pack-files-tree'
									? 'bg-secondary-bg'
									: 'text-muted-foreground',
							)}
						>
							<FolderTreeIcon className="me-2 hidden size-3.5 sm:block" />
							Pack Files Tree
						</Link>
						<Link
							to="/pack-conflicts"
							title="Pack Conflicts"
							className={cn(
								'hidden items-center justify-center rounded-none border-x px-3 py-2 text-center text-sm shadow-none transition-colors last:border-r-0 hover:bg-secondary-bg focus-visible:z-10',
								wouterLocation === '/pack-conflicts'
									? 'bg-secondary-bg'
									: 'text-muted-foreground',
							)}
						>
							<DatabaseZapIcon className="me-2 hidden size-3.5 sm:block" />
							Pack Conflicts
						</Link>
					</>
				)}
			</div>
		),
		[wouterLocation, selectedGame?.type],
	);

	return (
		<div className="flex items-center justify-between border-b">
			{wouterLocation === '/' && <ProfileSwitcher />}
			{toolbar}
			{navigationLinks}
		</div>
	);
};
