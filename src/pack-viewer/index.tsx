import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/resizable';

import { ModTree } from './tree-view';
import { FileContents } from './file-contents';

const PackViewer = () => {
	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="!h-[calc(100%-37px)]"
		>
			<ResizablePanel defaultSize={35}>
				<div className="overflow-y-auto h-full overflow-x-hidden divide-y">
					<ModTree />
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={65}>
				<FileContents />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
};

export default PackViewer;
