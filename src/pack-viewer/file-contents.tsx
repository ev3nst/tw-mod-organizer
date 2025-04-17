import { FileIcon } from 'lucide-react';

import { Loading } from '@/components/loading';

import { packManagerStore } from '@/lib/store/pack-manager';

import { PackImageRenderer } from './file-types/image';
import { PackLuaRenderer } from './file-types/lua';
import { PackDBRenderer } from './file-types/db';
import { PackLocRenderer } from './file-types/loc';
import { PackTextRenderer } from './file-types/text';
import { PackVMDRenderer } from './file-types/vmd';
import { PackVideoRenderer } from './file-types/video';
import { PackJSONRenderer } from './file-types/json';

export const FileContents = () => {
	const treeItemDataLoading = packManagerStore(s => s.treeItemDataLoading);
	const selectedTreeItem = packManagerStore(s => s.selectedTreeItem);
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);

	if (treeItemDataLoading) return <Loading />;

	switch (selectedTreeItemData?.type) {
		case 'text':
			if (selectedTreeItem?.id.endsWith('.lua')) {
				return <PackLuaRenderer />;
			}
			if (selectedTreeItem?.id.endsWith('.material')) {
				return <PackVMDRenderer />;
			}
			if (selectedTreeItem?.id.endsWith('.xml')) {
				return <PackVMDRenderer />;
			}
			if (selectedTreeItem?.id.endsWith('.json')) {
				return <PackJSONRenderer />;
			}
			return <PackTextRenderer />;

		case 'vmd':
			return <PackVMDRenderer />;

		case 'image':
			return <PackImageRenderer />;

		case 'video':
			return <PackVideoRenderer />;

		case 'db':
			return <PackDBRenderer />;

		case 'loc':
			return <PackLocRenderer />;

		default:
			return (
				<div className="w-full h-full flex justify-center items-center text-center">
					<div className="flex gap-3">
						<FileIcon />
						No file selected or rendering is not available.
					</div>
				</div>
			);
	}
};
