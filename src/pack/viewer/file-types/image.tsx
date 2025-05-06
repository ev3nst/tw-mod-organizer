import { packManagerStore } from '@/lib/store/pack-manager';

export const PackImageRenderer = () => {
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (typeof selectedTreeItemData === 'undefined') return null;

	return (
		<div className="flex size-full items-center justify-center overflow-auto">
			<img
				className="h-auto max-w-[1000px]"
				src={selectedTreeItemData.content}
			/>
		</div>
	);
};
