import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';

import { packManagerStore } from '@/lib/store/pack-manager';

export const PackVMDRenderer = () => {
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (typeof selectedTreeItemData === 'undefined') return null;

	return (
		<SyntaxHighlighter
			syntax="xml"
			content={selectedTreeItemData.content}
		/>
	);
};
