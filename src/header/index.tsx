import { SidebarIcon } from 'lucide-react';

import { useSidebar } from '@/components/sidebar';
import { Separator } from '@/components/separator';
import { Button } from '@/components/button';
import { ThemeCustomizer } from '@/components/theme-customizer';

import { Preferences } from './preferences';
import { WindowActions } from './window-actions';
import { GameSwitcher } from './game-switcher';
import { Create } from './create';
import { Refresh } from './refresh';
import { Nexus } from './nexus';
import { Version } from './version';

export function AppHeader() {
	const { toggleSidebar } = useSidebar();

	return (
		<header className="app-drag-region sticky right-0 top-0 z-50 flex h-[--header-height] w-full shrink-0 items-center justify-between gap-2 border-b bg-background pe-2 ps-4 transition-[width,height] ease-linear sm:left-0">
			<div className="flex items-center">
				<img className="h-10" src="/logo.png" />
				<GameSwitcher />
				<Create />
				<Nexus />
				<Refresh />
				<Version />
			</div>
			<div className="flex items-center gap-2">
				<Button
					className="clickable-content"
					variant="ghost"
					size="icon"
					onClick={toggleSidebar}
				>
					<SidebarIcon />
				</Button>
				<ThemeCustomizer />
				<Preferences />
				<Separator orientation="vertical" className="mr-2 h-4" />
				<WindowActions />
			</div>
		</header>
	);
}
