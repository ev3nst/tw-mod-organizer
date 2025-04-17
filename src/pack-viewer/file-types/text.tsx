import { ScrollArea } from '@/components/scroll-area';
import { packManagerStore } from '@/lib/store/pack-manager';

export const PackTextRenderer = () => {
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (typeof selectedTreeItemData === 'undefined') return null;

	return (
		<ScrollArea className="h-full w-full">
			<pre className="p-5">{selectedTreeItemData.content}</pre>
		</ScrollArea>
	);
};
