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

	const renderToolbar = () => {
		if (selectedGame?.type !== 'totalwar') return null;

		if (wouterLocation === '/pack-viewer') {
			return (
				<div className="flex items-baseline gap-2 ps-1">
					<div className="font-bold flex-shrink-0 mx-1">
						Selected File:
					</div>
					<div className="font-semibold truncate text-primary flex items-center gap-2">
						{selectedTreeItem?.pack_file_name}
						{typeof selectedTreeItem?.pack_file_path ===
							'string' && (
							<div
								className="hover:cursor-pointer hover:brightness-125"
								onClick={() =>
									api.open_pack_file(
										selectedTreeItem.pack_file_path,
									)
								}
							>
								<ExternalLinkIcon className="w-4 h-4" />
							</div>
						)}
					</div>
					<div className="italic text-sm text-primary truncate">
						{selectedTreeItem?.id}
					</div>
				</div>
			);
		}
	};

	return (
		<div className="flex justify-between items-center border-b">
			{wouterLocation === '/' && <ProfileSwitcher />}
			{renderToolbar()}

			<div className="flex -space-x-px flex-shrink-0">
				<Link
					to="/"
					title="Mod List"
					className={cn(
						'flex items-center justify-center px-3 py-2 text-center text-sm transition-colors rounded-none shadow-none focus-visible:z-10 border-r last:border-r-0 hover:bg-secondary-bg border-l',
						wouterLocation === '/'
							? 'bg-secondary-bg'
							: 'text-muted-foreground',
					)}
				>
					<FolderArchiveIcon className="w-3.5 h-3.5 me-2 hidden sm:block" />
					Mod List
				</Link>
				{selectedGame?.type === 'totalwar' && (
					<>
						<Link
							to="/pack-viewer"
							title="Pack Viewer"
							className={cn(
								'flex items-center justify-center px-3 py-2 text-center text-sm transition-colors rounded-none shadow-none focus-visible:z-10 border-r last:border-r-0 hover:bg-secondary-bg border-l',
								wouterLocation === '/pack-viewer'
									? 'bg-secondary-bg'
									: 'text-muted-foreground',
							)}
						>
							<FileCode2Icon className="w-3.5 h-3.5 me-2 hidden sm:block" />
							Pack Viewer
						</Link>
						<Link
							to="/pack-files-tree"
							title="Pack Files Tree"
							className={cn(
								'hidden items-center justify-center px-3 py-2 text-center text-sm transition-colors rounded-none shadow-none focus-visible:z-10 border-r last:border-r-0 hover:bg-secondary-bg border-l',
								wouterLocation === '/pack-files-tree'
									? 'bg-secondary-bg'
									: 'text-muted-foreground',
							)}
						>
							<FolderTreeIcon className="w-3.5 h-3.5 me-2 hidden sm:block" />
							Pack Files Tree
						</Link>
						<Link
							to="/pack-conflicts"
							title="Pack Conflicts"
							className={cn(
								'hidden items-center justify-center px-3 py-2 text-center text-sm transition-colors rounded-none shadow-none focus-visible:z-10 border-r last:border-r-0 hover:bg-secondary-bg border-l',
								wouterLocation === '/pack-conflicts'
									? 'bg-secondary-bg'
									: 'text-muted-foreground',
							)}
						>
							<DatabaseZapIcon className="w-3.5 h-3.5 me-2 hidden sm:block" />
							Pack Conflicts
						</Link>
					</>
				)}
			</div>
		</div>
	);
};
