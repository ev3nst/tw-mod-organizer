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
	const prefixToRemove = 'db/';
	if (prefixToRemove && path.startsWith(prefixToRemove)) {
		path = path.slice(prefixToRemove.length);
	}

	const keys = path.split('/').filter(Boolean);
	return keys.reduce<any>((acc, key) => acc?.[key], obj);
}

export const PackDBRenderer = () => {
	const selectedTreeItemDb = packManagerStore(s => s.selectedTreeItemDb);
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (
		typeof selectedTreeItemData === 'undefined' ||
		typeof selectedTreeItemDb === 'undefined'
	)
		return null;

	const selectedTableData = getTableByPath(
		selectedTreeItemDb.data,
		selectedTreeItemData.content,
	);

	if (typeof selectedTableData === 'undefined' || !selectedTableData[0]) {
		console.log(selectedTreeItemDb, 'selectedTreeItemDb');
		console.log(selectedTreeItemData, 'selectedTreeItemData');
		return (
			<div>
				Data is empty or there was an unexpected error while fetching
				the data.
			</div>
		);
	}

	const columns = Object.keys(selectedTableData[0]);
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
									key={`db_column_${column}`}
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
								key={`db_row_${ri}`}
								className="hover:bg-secondary-bg"
							>
								{columns.map(column => (
									<TableCell
										key={`db_row_${ri}_column_${column}`}
										className="text-left px-5 break-all border"
									>
										{typeof row[column] === 'boolean' ? (
											row[column] === true ? (
												<CheckIcon className="h-4 w-4 text-green-500" />
											) : (
												<XIcon className="h-4 w-4 text-red-500" />
											)
										) : (
											row[column]
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
