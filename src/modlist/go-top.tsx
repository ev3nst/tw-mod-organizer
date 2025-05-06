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
                absolute bottom-20 right-0 z-10 mb-2 mr-2 self-end
                transition-all duration-300
                ${
					showGoUp
						? 'pointer-events-auto translate-y-0 opacity-100'
						: 'pointer-events-none translate-y-8 opacity-0'
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
