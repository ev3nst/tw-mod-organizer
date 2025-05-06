import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/button';

import { cn } from '@/lib/utils';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
	<nav role="navigation" aria-label="pagination" {...props} />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		className={cn('flex flex-row items-center gap-1', className)}
		{...props}
	/>
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<'li'>
>(({ className, ...props }, ref) => <li ref={ref} {...props} />);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
	React.ComponentProps<'button'>;

const PaginationLink = ({
	className,
	isActive,
	size = 'icon',
	...props
}: PaginationLinkProps) => (
	<Button
		className="size-8 [&_svg]:size-3.5"
		variant={isActive ? 'outline' : 'ghost'}
		aria-current={isActive ? 'page' : undefined}
		size={size}
		{...props}
	/>
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink aria-label="Go to previous page" size="icon" {...props}>
		<ChevronLeft />
	</PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to next page"
		size="icon"
		className={cn('gap-1 pr-2.5', className)}
		{...props}
	>
		<ChevronRight />
	</PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({
	className,
	...props
}: React.ComponentProps<'span'>) => (
	<span
		aria-hidden
		className={cn(
			'flex size-5 items-center justify-center text-muted-foreground',
			className,
		)}
		{...props}
	>
		<MoreHorizontal />
		<span className="sr-only">More pages</span>
	</span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
	Pagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
};
