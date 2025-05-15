import { Button } from '@/components/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { ScrollArea } from '@/components/scroll-area';

type SubscriptionErrorDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	erroredMods: Array<{
		title: string;
		id: string;
		error: string;
	}>;
	onContinue: () => void;
	onAbort: () => void;
};

export const SubscriptionErrorDialog = ({
	open,
	onOpenChange,
	erroredMods,
	onContinue,
	onAbort,
}: SubscriptionErrorDialogProps) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-[600px]"
				onEscapeKeyDown={e => e.preventDefault()}
				onInteractOutside={e => e.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle className="text-red-500">
						Subscription Errors Detected
					</DialogTitle>
					<DialogDescription>
						The following mods could not be subscribed from Steam
						Workshop. They may have been removed by the author or
						banned by Steam moderation.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[500px]">
					<div className="space-y-2">
						{erroredMods.map(mod => (
							<div
								key={mod.id}
								className="rounded-md border border-red-200 bg-red-50 p-2 text-sm dark:border-red-900 dark:bg-red-950/30"
							>
								<h3 className="font-medium">
									{mod.title || `Unknown Mod (${mod.id})`}
								</h3>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									{mod.error}
								</p>
							</div>
						))}
					</div>
				</ScrollArea>

				<DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
					<Button
						variant="destructive"
						onClick={onAbort}
						className="mb-2 sm:mb-0"
					>
						Abort - Rollback
					</Button>
					<Button variant="default" onClick={onContinue}>
						Continue Anyway
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
