import { useMemo, useState } from 'react';
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	FileIcon,
	XIcon,
} from 'lucide-react';
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	ColumnDef,
	SortingState,
	ColumnFiltersState,
	flexRender,
} from '@tanstack/react-table';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/table';
import { PaginationControls } from '@/components/pagination-controls';
import { Input } from '@/components/input';
import { RadioGroup, RadioGroupItem } from '@/components/radio-group';

import { getDbTableByPath, packManagerStore } from '@/lib/store/pack-manager';

export const PackDBRenderer = () => {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState({});
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(20);

	const selectedTreeItemDb = packManagerStore(s => s.selectedTreeItemDb);
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (
		typeof selectedTreeItemData === 'undefined' ||
		typeof selectedTreeItemDb === 'undefined'
	)
		return null;

	const selectedTableData = getDbTableByPath(
		selectedTreeItemDb.data,
		selectedTreeItemData.content,
	);

	if (typeof selectedTableData === 'undefined' || !selectedTableData[0]) {
		console.log(selectedTreeItemDb, 'selectedTreeItemDb');
		console.log(selectedTreeItemData, 'selectedTreeItemData');
		return (
			<div className="w-full h-full flex justify-center items-center text-center">
				<div className="flex gap-3">
					<FileIcon />
					Data is empty or there was an unexpected error while
					fetching the data.
				</div>
			</div>
		);
	}

	const data = useMemo(() => {
		return getDbTableByPath(
			selectedTreeItemDb.data,
			selectedTreeItemData.content,
		);
	}, [selectedTreeItemDb.data, selectedTreeItemData.content]);

	const columns = useMemo<ColumnDef<any>[]>(() => {
		if (!data?.[0]) return [];
		return Object.keys(data[0]).map(key => ({
			id: key,
			accessorKey: key,
			header: key.toUpperCase(),
			cell: ({ getValue }) => {
				const value = getValue();
				if (typeof value === 'boolean') {
					return value ? (
						<CheckIcon className="h-4 w-4 text-green-500" />
					) : (
						<XIcon className="h-4 w-4 text-red-500" />
					);
				}
				return value;
			},
		}));
	}, [data]);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			pagination: {
				pageIndex: currentPage - 1,
				pageSize: perPage,
			},
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<div className="relative h-full w-full overflow-auto dark-scrollbar">
			<div className="sticky bg-background left-0 top-0 z-10 w-full flex items-center justify-between px-3 py-2.5 border-b">
				<PaginationControls
					currentPage={currentPage}
					totalItems={table.getFilteredRowModel().rows.length}
					perPage={perPage}
					onPageChange={page => {
						setCurrentPage(page);
						table.setPageIndex(page - 1);
					}}
					onPerPageChange={newPerPage => {
						setPerPage(newPerPage);
						setCurrentPage(1);
						table.setPageSize(newPerPage);
					}}
					perPageOptions={[10, 20, 30, 50, 100, 500, 1000, 2000]}
				/>
			</div>
			<div className="min-w-max mb-[10px]">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow
								key={headerGroup.id}
								className="hover:bg-background"
							>
								{headerGroup.headers.map(header => (
									<TableHead
										key={header.id}
										className="text-left px-5 pt-3 uppercase border-r hover:text-primary"
									>
										<div className="flex flex-col gap-2">
											<div
												className={
													header.column.getCanSort()
														? 'cursor-pointer select-none flex items-center gap-2'
														: ''
												}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef
														.header,
													header.getContext(),
												)}
												{header.column.getIsSorted() ===
													'asc' && (
													<ArrowUpIcon className="w-4 h-4 text-muted-foreground" />
												)}
												{header.column.getIsSorted() ===
													'desc' && (
													<ArrowDownIcon className="w-4 h-4 text-muted-foreground" />
												)}
											</div>

											{typeof data[0][
												header.column.id
											] === 'boolean' ? (
												<RadioGroup
													className="flex gap-2 text-xs h-[39px] items-center"
													value={
														header.column.getFilterValue() ===
														undefined
															? ''
															: header.column
																	.getFilterValue()
																	?.toString()
													}
													onValueChange={value => {
														header.column.setFilterValue(
															value === ''
																? undefined
																: value ===
																		'true',
														);
													}}
												>
													<RadioGroupItem
														value="true"
														id={`filter-${header.id}-true`}
													/>
													<label
														htmlFor={`filter-${header.id}-true`}
													>
														True
													</label>
													<RadioGroupItem
														value="false"
														id={`filter-${header.id}-false`}
													/>
													<label
														htmlFor={`filter-${header.id}-false`}
													>
														False
													</label>
													<RadioGroupItem
														value=""
														id={`filter-${header.id}-all`}
													/>
													<label
														htmlFor={`filter-${header.id}-all`}
													>
														All
													</label>
												</RadioGroup>
											) : (
												<Input
													className="max-w-sm mb-2"
													placeholder="Filter"
													value={
														typeof header.column.getFilterValue() ===
														'string'
															? (header.column.getFilterValue() as string)
															: ''
													}
													onChange={e =>
														header.column.setFilterValue(
															e.target.value,
														)
													}
												/>
											)}
										</div>
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map(row => (
							<TableRow
								key={row.id}
								className="hover:bg-secondary-bg"
							>
								{row.getVisibleCells().map(cell => (
									<TableCell
										key={cell.id}
										className="text-left px-5 break-all border"
									>
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext(),
										)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};
