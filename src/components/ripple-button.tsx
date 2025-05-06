import { useState, useCallback, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { ButtonProps } from '@/components/button';

import { buttonVariants, cn } from '@/lib/utils';

type Ripple = {
	id: string;
	size: number;
	x: number;
	y: number;
};

function getUniqueID(prefix: string) {
	return `${prefix}-${Math.floor(Math.random() * 1000000)}`;
}

export function useRipple() {
	const [ripples, setRipples] = useState<Ripple[]>([]);

	const createRipple = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const button = e.currentTarget;
			const rect = button.getBoundingClientRect();
			const size = Math.max(rect.width, rect.height);
			const x = e.clientX - rect.left - size / 2;
			const y = e.clientY - rect.top - size / 2;

			const newRipple: Ripple = {
				id: getUniqueID('ripple'),
				size,
				x,
				y,
			};

			setRipples(prev => [...prev, newRipple]);
			setTimeout(() => {
				setRipples(prev => prev.filter(r => r.id !== newRipple.id));
			}, 1300);
		},
		[],
	);

	return { ripples, createRipple };
}

export const RippleButton = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, variant, size, asChild = false, children, ...props },
		ref,
	) => {
		const { ripples, createRipple } = useRipple();
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				onMouseDown={createRipple}
				className={cn(
					buttonVariants({ variant, size, className }),
					'relative select-none overflow-hidden',
				)}
				ref={ref}
				{...props}
			>
				{children}
				<span className="pointer-events-none absolute inset-0">
					{ripples.map(ripple => (
						<span
							key={ripple.id}
							className="animate-ripple absolute rounded-full bg-white opacity-30"
							style={{
								width: ripple.size,
								height: ripple.size,
								top: ripple.y,
								left: ripple.x,
							}}
						></span>
					))}
				</span>
			</Comp>
		);
	},
);
