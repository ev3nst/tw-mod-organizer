import { Loading } from '@/components/loading';
import { ScrollArea } from '@/components/scroll-area';
import { packManagerStore } from '@/lib/store/pack-manager';
import { FileIcon } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { monokaiSublime } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export const FileContents = () => {
	const treeItemDataLoading = packManagerStore(s => s.treeItemDataLoading);
	const selectedTreeItem = packManagerStore(s => s.selectedTreeItem);
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);

	if (treeItemDataLoading) return <Loading />;

	if (
		selectedTreeItemData?.type === 'text' &&
		selectedTreeItem?.id.endsWith('.lua')
	) {
		return (
			<ScrollArea className="overflow-y-auto h-full overflow-x-hidden ">
				<SyntaxHighlighter
					language="lua"
					style={monokaiSublime}
					wrapLongLines
					wrapLines
					showLineNumbers
					customStyle={{
						fontFamily:
							'"Fira Code", Consolas, Menlo, Monaco, "Courier New", monospace',
						fontSize: '13px',
						borderRadius: 0,
						background: 'hsl(var(--background))',
					}}
					lineProps={{ style: { flexWrap: 'wrap' } }}
					lineNumberStyle={{
						minWidth: '2em',
						paddingRight: '0.5em',
						color: '#888',
					}}
				>
					{selectedTreeItemData.content}
				</SyntaxHighlighter>
			</ScrollArea>
		);
	}

	if (selectedTreeItemData?.type === 'image') {
		return (
			<div className="w-full h-full flex justify-center items-center">
				<img
					className="max-w-[1000px] h-auto"
					src={selectedTreeItemData.content}
				/>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex justify-center items-center text-center">
			<div className="flex gap-3">
				<FileIcon />
				No file selected.
			</div>
		</div>
	);
};
