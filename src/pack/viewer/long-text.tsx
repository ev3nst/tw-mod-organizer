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
					<DialogTitle className="flex max-w-full flex-col gap-3 overflow-hidden">
						<div className="max-w-full overflow-hidden break-words">
							{longText?.key}
						</div>
					</DialogTitle>

					<DialogDescription className="mt-1 flex max-w-full flex-col space-y-1 overflow-hidden">
						<span className="max-w-full overflow-hidden break-words text-lg font-semibold text-primary">
							{selectedTreeItem?.pack_file_name}
						</span>
						<span className="max-w-full overflow-hidden break-words text-sm italic text-primary">
							{selectedTreeItem?.id}
						</span>
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
