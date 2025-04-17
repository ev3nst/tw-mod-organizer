import { Link, useLocation } from 'wouter';
import { FileCode2Icon, FolderArchiveIcon } from 'lucide-react';

import { ProfileSwitcher } from '@/nav/profile';

import { settingStore } from '@/lib/store/setting';
import { cn } from '@/lib/utils';
import { packManagerStore } from '@/lib/store/pack-manager';

export const AppNav = () => {
	const [wouterLocation] = useLocation();

	const selectedGame = settingStore(state => state.selectedGame);

	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);

	if (selectedGame?.type !== 'totalwar') return null;

	return (
		<div className="flex justify-between items-center border-b">
			{wouterLocation === '/' && <ProfileSwitcher />}
			{wouterLocation === '/pack-viewer' && (
				<div className="flex items-baseline gap-2 ps-1">
					<div className="font-bold flex-shrink-0 mx-1">
						Selected File:
					</div>
					<div className="font-semibold truncate text-primary">
						{selectedTreeItem?.pack_file_name}
					</div>
					<div className="italic text-sm text-primary truncate">
						{selectedTreeItem?.id}
					</div>
				</div>
			)}

			<div className="flex -space-x-px flex-shrink-0">
				<Link
					to="/"
					title="Mod List"
					className={cn(
						'flex items-center justify-center px-3 py-2 text-center text-xs md:text-sm transition-colors rounded-none shadow-none focus-visible:z-10 border-r last:border-r-0 hover:bg-secondary-bg border-l',
						wouterLocation === '/'
							? 'bg-secondary-bg'
							: 'text-muted-foreground',
					)}
				>
					<FolderArchiveIcon className="w-3.5 h-3.5 me-2 hidden sm:block" />
					Mod List
				</Link>
				<Link
					to="/pack-viewer"
					title="Pack Viewer"
					className={cn(
						'flex items-center justify-center px-3 py-2 text-center text-xs md:text-sm transition-colors rounded-none shadow-none focus-visible:z-10 border-r last:border-r-0 hover:bg-secondary-bg border-l',
						wouterLocation === '/pack-viewer'
							? 'bg-secondary-bg'
							: 'text-muted-foreground',
					)}
				>
					<FileCode2Icon className="w-3.5 h-3.5 me-2 hidden sm:block" />
					Pack Viewer
				</Link>
			</div>
		</div>
	);
};
