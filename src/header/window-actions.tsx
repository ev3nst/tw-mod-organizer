import { XIcon, SquareIcon, MinusIcon } from 'lucide-react';

import { getCurrentWindow } from '@tauri-apps/api/window';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/alert-dialog';
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
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="ghost"
						className="clickable-content h-8 w-8 px-0 hover:bg-red-800"
					>
						<XIcon className="h-[1.2rem] w-[1.2rem]" />
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Close Application</AlertDialogTitle>
						<AlertDialogDescription>
							If there is any active process running they might
							not close along with the application.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleClose}>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
