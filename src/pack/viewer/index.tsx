import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/resizable';

import { TreeView } from './tree-view';
import { FileContents } from './file-contents';
import { LongTextDialog } from './long-text';

const PackViewer = () => {
	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="!h-[calc(100%-37px)]"
		>
			<ResizablePanel defaultSize={25}>
				<div className="dark-scrollbar h-full divide-y overflow-y-auto overflow-x-hidden">
					<TreeView />
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={75}>
				<FileContents />
				<LongTextDialog />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
};

export default PackViewer;
