import { packManagerStore } from '@/lib/store/pack-manager';

export const PackImageRenderer = () => {
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (typeof selectedTreeItemData === 'undefined') return null;

	return (
		<div className="w-full h-full flex justify-center items-center">
			<img
				className="max-w-[1000px] h-auto"
				src={selectedTreeItemData.content}
			/>
		</div>
	);
};
