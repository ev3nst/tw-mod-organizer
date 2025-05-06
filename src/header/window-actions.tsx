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
				className="clickable-content size-8 px-0"
				onClick={handleMinimize}
			>
				<MinusIcon className="size-[1rem]" />
			</Button>
			<Button
				variant="ghost"
				className="clickable-content size-8 px-0"
				onClick={handleMaximize}
			>
				<SquareIcon className="size-[0.85rem]" />
			</Button>
			<Button
				variant="ghost"
				className="clickable-content size-8 px-0 hover:bg-red-800"
				onClick={handleClose}
			>
				<XIcon className="size-[1.2rem]" />
			</Button>
		</div>
	);
}
