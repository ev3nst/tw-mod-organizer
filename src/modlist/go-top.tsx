import { Button } from '@/components/button';
import { ChevronsUpIcon } from 'lucide-react';
import { useState, useImperativeHandle, forwardRef } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';

type GoTopProps = {
	virtuosoRef: React.RefObject<VirtuosoHandle>;
};

export type GoTopHandle = {
	onScroll: (scrollTop: number) => void;
};

export const GoTop = forwardRef<GoTopHandle, GoTopProps>(
	({ virtuosoRef }, ref) => {
		const [showGoUp, setShowGoUp] = useState(false);

		useImperativeHandle(ref, () => ({
			onScroll: (scrollTop: number) => {
				if (showGoUp !== scrollTop > 400) {
					setShowGoUp(scrollTop > 400);
				}
			},
		}));

		return (
			<Button
				className={`
                self-end mb-2 mr-2 z-10 absolute bottom-20 right-0
                transition-all duration-300
                ${
					showGoUp
						? 'opacity-100 translate-y-0 pointer-events-auto'
						: 'opacity-0 translate-y-8 pointer-events-none'
				}
            `}
				size="icon"
				variant="info"
				onClick={() =>
					virtuosoRef.current?.scrollTo({
						top: 0,
					})
				}
				aria-label="Go Up"
			>
				<ChevronsUpIcon />
			</Button>
		);
	},
);
