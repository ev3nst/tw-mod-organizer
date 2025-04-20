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
				<div className="overflow-y-auto h-full overflow-x-hidden divide-y dark-scrollbar">
					<TreeView />
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel
				defaultSize={75}
				className="relative overflow-hidden"
			>
				<div className="h-full w-full overflow-auto dark-scrollbar">
					<FileContents />
				</div>
				<LongTextDialog />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
};

export default PackViewer;
