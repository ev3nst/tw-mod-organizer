import { SidebarIcon } from 'lucide-react';

import { useSidebar } from '@/components/sidebar';
import { Separator } from '@/components/separator';
import { Button } from '@/components/button';

import { Settings } from './settings';
import { WindowActions } from './window-actions';
import { GameSwitcher } from './game-switcher';
import { Create } from './create';
import { Refresh } from './refresh';
import { Nexus } from './nexus';

export function Header() {
	const { toggleSidebar } = useSidebar();

	return (
		<header className="flex sticky top-0 z-50 w-full shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear ps-4 pe-2 app-drag-region bg-background right-0 border-b sm:left-0 h-[--header-height]">
			<div className="flex items-center">
				<img className="h-10" src="/logo.png" />
				<GameSwitcher />
				<Create />
				<Nexus />
				<Refresh />
				<div className="text-xs text-muted-foreground ms-2">v0.1.4</div>
			</div>
			<div className="flex gap-2 items-center">
				<Button
					className="clickable-content"
					variant="ghost"
					size="icon"
					onClick={toggleSidebar}
				>
					<SidebarIcon />
				</Button>
				<Settings />
				<Separator orientation="vertical" className="mr-2 h-4" />
				<WindowActions />
			</div>
		</header>
	);
}
