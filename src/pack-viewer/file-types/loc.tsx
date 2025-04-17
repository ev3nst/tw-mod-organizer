import { CheckIcon, XIcon } from 'lucide-react';

import { ScrollArea } from '@/components/scroll-area';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/table';

import { packManagerStore } from '@/lib/store/pack-manager';

function getTableByPath(obj: any, path: string): any {
	const prefixToRemove = 'text/';
	if (prefixToRemove && path.startsWith(prefixToRemove)) {
		path = path.slice(prefixToRemove.length);
	}

	const keys = path.split('/').filter(Boolean);
	return keys.reduce<any>((acc, key) => acc?.[key], obj);
}

export const PackLocRenderer = () => {
	const selectedTreeItemLoc = packManagerStore(s => s.selectedTreeItemLoc);
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	const setLongTextDialogOpen = packManagerStore(
		state => state.setLongTextDialogOpen,
	);
	const setLongText = packManagerStore(state => state.setLongText);

	if (
		typeof selectedTreeItemData === 'undefined' ||
		typeof selectedTreeItemLoc === 'undefined'
	)
		return null;

	const selectedTableData = getTableByPath(
		selectedTreeItemLoc.data,
		selectedTreeItemData.content.replace('text/', 't/'),
	);

	const columns = Object.keys(selectedTableData[0]);

	const renderLocContent = (value: string, key?: string) => {
		if (value.length > 400) {
			return (
				<div
					className="truncate max-w-[300px] hover:text-blue-500 hover:cursor-pointer underline"
					onClick={() => {
						setLongText({
							key,
							value,
						});
						setLongTextDialogOpen(true);
					}}
				>
					{value}
				</div>
			);
		}

		return value;
	};

	return (
		<ScrollArea className="h-full w-full">
			<div className="min-w-max">
				<Table>
					<TableCaption className="pb-3">
						{selectedTreeItemData.content} (
						{selectedTableData.length})
					</TableCaption>
					<TableHeader>
						<TableRow>
							{columns.map(column => (
								<TableHead
									key={`loc_column_${column}`}
									className="text-left px-5 uppercase border-r"
								>
									{column}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{selectedTableData.map((row: any, ri: number) => (
							<TableRow
								key={`loc_row_${ri}`}
								className="hover:bg-secondary-bg"
							>
								{columns.map((column, ci) => (
									<TableCell
										key={`loc_row_${ri}_column_${column}`}
										className="text-left px-5 max-w-[300px] break-all border"
									>
										{typeof row[column] === 'boolean' ? (
											row[column] === true ? (
												<CheckIcon className="h-4 w-4 text-green-500" />
											) : (
												<XIcon className="h-4 w-4 text-red-500" />
											)
										) : (
											renderLocContent(
												row[column],
												row[columns[ci - 1]],
											)
										)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</ScrollArea>
	);
};
