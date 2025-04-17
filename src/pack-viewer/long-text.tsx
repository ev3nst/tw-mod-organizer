import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';

import { packManagerStore } from '@/lib/store/pack-manager';
import { ScrollArea } from '@/components/scroll-area';

export function LongTextDialog() {
	const longTextDialogOpen = packManagerStore(
		state => state.longTextDialogOpen,
	);
	const setLongTextDialogOpen = packManagerStore(
		state => state.setLongTextDialogOpen,
	);
	const longText = packManagerStore(state => state.longText);
	const selectedTreeItem = packManagerStore(state => state.selectedTreeItem);

	return (
		<Dialog
			open={longTextDialogOpen}
			onOpenChange={isOpen => setLongTextDialogOpen(isOpen)}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader className="max-w-full overflow-hidden">
					<DialogTitle className="flex flex-col gap-3 max-w-full overflow-hidden">
						<div className="break-words max-w-full overflow-hidden">
							{longText?.key}
						</div>
					</DialogTitle>

					<DialogDescription className="text-xs mt-1 flex flex-col space-y-1 max-w-full overflow-hidden">
						<div className="font-semibold text-primary break-words max-w-full overflow-hidden">
							{selectedTreeItem?.pack_file_name}
						</div>
						<div className="italic text-sm text-primary break-words max-w-full overflow-hidden">
							{selectedTreeItem?.id}
						</div>
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="h-[400px] rounded-md border p-4">
					{longText?.value?.split('\\\\n\\\\n').map((part, idx) => (
						<p key={idx} className="mb-3">
							{part}
						</p>
					))}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
