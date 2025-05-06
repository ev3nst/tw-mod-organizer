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

import { getLocTableByPath, packManagerStore } from '@/lib/store/pack-manager';

export const PackLocRenderer = () => {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState({});
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(20);

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

	const selectedTableData = getLocTableByPath(
		selectedTreeItemLoc.data,
		selectedTreeItemData.content,
	);

	if (typeof selectedTableData === 'undefined' || !selectedTableData[0]) {
		console.log(selectedTreeItemLoc, 'selectedTreeItemLoc');
		console.log(selectedTreeItemData, 'selectedTreeItemData');
		return (
			<div className="flex size-full items-center justify-center text-center">
				<div className="flex gap-3">
					<FileIcon />
					Data is empty or there was an unexpected error while
					fetching the data.
				</div>
			</div>
		);
	}

	const renderLocContent = (value: string, key?: string) => {
		if (value.length > 300) {
			return (
				<div
					className="max-w-[400px] truncate underline hover:cursor-pointer hover:text-blue-500"
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

	const data = useMemo(() => {
		return getLocTableByPath(
			selectedTreeItemLoc.data,
			selectedTreeItemData.content,
		);
	}, [selectedTreeItemLoc.data, selectedTreeItemData.content]);

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
						<CheckIcon className="size-4 text-green-500" />
					) : (
						<XIcon className="size-4 text-red-500" />
					);
				}

				if (typeof value === 'string') {
					return renderLocContent(value);
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
		<div className="dark-scrollbar relative size-full overflow-auto">
			<div className="sticky left-0 top-0 z-10 flex w-full items-center justify-between border-b bg-background px-3 py-2.5">
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
			<div className="mb-[10px] min-w-max">
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
										className="border-r px-5 pt-3 text-left uppercase hover:text-primary"
									>
										<div className="flex flex-col gap-2">
											<div
												className={
													header.column.getCanSort()
														? 'flex cursor-pointer select-none items-center gap-2'
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
													<ArrowUpIcon className="size-4 text-muted-foreground" />
												)}
												{header.column.getIsSorted() ===
													'desc' && (
													<ArrowDownIcon className="size-4 text-muted-foreground" />
												)}
											</div>

											{typeof data[0][
												header.column.id
											] === 'boolean' ? (
												<RadioGroup
													className="flex h-[39px] items-center gap-2 text-xs"
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
													className="mb-2 max-w-sm"
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
										className="break-all border px-5 text-left"
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
