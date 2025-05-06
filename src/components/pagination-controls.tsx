import { useState } from 'react';
import { ChevronFirst, ChevronLast } from 'lucide-react';

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationEllipsis,
} from '@/components/pagination';
import { Button } from '@/components/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/popover';
import { Input } from '@/components/input';

interface PaginationControlsProps {
	currentPage: number;
	totalItems: number;
	perPage: number;
	onPageChange: (page: number) => void;
	onPerPageChange: (perPage: number) => void;
	perPageOptions?: number[];
	isCompact?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
	currentPage,
	totalItems,
	perPage,
	onPageChange,
	onPerPageChange,
	perPageOptions = [5, 10, 20, 30, 50],
	isCompact,
}) => {
	const [goToPage, setGoToPage] = useState<string>('');

	const totalPages = Math.ceil(totalItems / perPage);
	const startItem = (currentPage - 1) * perPage + 1;
	const endItem = Math.min(currentPage * perPage, totalItems);

	const getPageNumbers = () => {
		const pageNumbers: number[] = [];
		const maxVisible = 3;
		let startPage = Math.max(currentPage - Math.floor(maxVisible / 2), 1);
		const endPage = Math.min(startPage + maxVisible - 1, totalPages);

		startPage = Math.max(endPage - maxVisible + 1, 1);

		for (let i = startPage; i <= endPage; i++) {
			pageNumbers.push(i);
		}

		return pageNumbers;
	};

	const pageNumbers = getPageNumbers();

	return (
		<div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row">
			<div className="flex flex-col items-center justify-between sm:flex-row">
				<div className="flex items-center gap-2">
					{!isCompact && (
						<span className="whitespace-nowrap text-sm font-medium">
							Per Page:
						</span>
					)}
					<Select
						value={perPage.toString()}
						onValueChange={value => onPerPageChange(Number(value))}
					>
						<SelectTrigger
							className={
								isCompact
									? 'w-[50px] justify-center'
									: 'mx-1 w-[80px]'
							}
							disableIcon={isCompact}
						>
							<SelectValue placeholder={perPage.toString()} />
						</SelectTrigger>
						<SelectContent>
							{perPageOptions.map(option => (
								<SelectItem
									key={option}
									value={option.toString()}
								>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{!isCompact && (
					<div className="ms-4 text-sm text-muted-foreground">
						Viewing {totalItems > 0 ? startItem : 0}-{endItem} of{' '}
						{totalItems} items
					</div>
				)}
			</div>

			<div className="flex items-center gap-2">
				{/* Go To Page Popover */}
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline" size="sm" className="w-30">
							Go To Page
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-40">
						<div className="flex flex-col gap-2">
							<Input
								type="number"
								placeholder={`Page # (1-${totalPages})`}
								value={goToPage}
								onChange={e => {
									let page = parseInt(e.target.value, 10);
									if (page > totalPages) {
										page = totalPages;
									}
									setGoToPage(String(page));
								}}
								className="w-full"
								min={1}
								max={totalPages}
							/>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									const page = parseInt(goToPage, 10);
									if (
										!isNaN(page) &&
										page >= 1 &&
										page <= totalPages
									) {
										onPageChange(page);
										setGoToPage('');
									}
								}}
							>
								Go
							</Button>
						</div>
					</PopoverContent>
				</Popover>

				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<Button
								className="size-8 [&_svg]:size-3.5"
								variant="ghost"
								size="icon"
								onClick={() => onPageChange(1)}
								disabled={currentPage === 1}
								aria-label="Go to first page"
							>
								<ChevronFirst className="size-4" />
							</Button>
						</PaginationItem>

						<PaginationItem>
							<PaginationPrevious
								onClick={() => onPageChange(currentPage - 1)}
								disabled={currentPage === 1}
							/>
						</PaginationItem>

						{!isCompact && pageNumbers[0] > 1 && (
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
						)}

						{pageNumbers.map(page => (
							<PaginationItem key={page}>
								<PaginationLink
									isActive={page === currentPage}
									onClick={() => onPageChange(page)}
								>
									{page}
								</PaginationLink>
							</PaginationItem>
						))}

						{!isCompact &&
							pageNumbers[pageNumbers.length - 1] <
								totalPages && (
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
							)}

						<PaginationItem>
							<PaginationNext
								onClick={() => onPageChange(currentPage + 1)}
								disabled={currentPage >= totalPages}
							/>
						</PaginationItem>

						<PaginationItem>
							<Button
								className="size-8 [&_svg]:size-3.5"
								variant="ghost"
								size="icon"
								onClick={() => onPageChange(totalPages)}
								disabled={currentPage >= totalPages}
								aria-label="Go to last page"
							>
								<ChevronLast className="size-4" />
							</Button>
						</PaginationItem>
						<div className="text-sm">Total: {totalPages}</div>
					</PaginationContent>
				</Pagination>
			</div>
		</div>
	);
};
