import { XIcon, SquareIcon, MinusIcon } from 'lucide-react';

import { getCurrentWindow } from '@tauri-apps/api/window';

import { Button } from '@/components/button';

import { cn } from '@/lib/utils';

export function WindowActions({ className }: { className?: string }) {
	const appWindow = getCurrentWindow();

	const handleMinimize = async () => {
		await appWindow.minimize();
	};

	const handleMaximize = async () => {
		await appWindow.toggleMaximize();
	};

	const handleClose = async () => {
		await appWindow.close();
	};

	return (
		<div className={cn('flex gap-1', className)}>
			<Button
				variant="ghost"
				className="clickable-content h-8 w-8 px-0"
				onClick={handleMinimize}
			>
				<MinusIcon className="h-[1rem] w-[1rem]" />
			</Button>
			<Button
				variant="ghost"
				className="clickable-content h-8 w-8 px-0"
				onClick={handleMaximize}
			>
				<SquareIcon className="h-[0.85rem] w-[0.85rem]" />
			</Button>
			<Button
				variant="ghost"
				className="clickable-content h-8 w-8 px-0 hover:bg-red-800"
				onClick={handleClose}
			>
				<XIcon className="h-[1.2rem] w-[1.2rem]" />
			</Button>
		</div>
	);
}
