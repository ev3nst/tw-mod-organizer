import { useEffect, useState } from 'react';
import { LoaderIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const Loading = ({
	className,
	timeoutMs,
}: {
	className?: string;
	timeoutMs?: number;
}) => {
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		const timeout = setTimeout(() => {
			setLoading(false);
		}, timeoutMs ?? 500);

		return () => {
			clearTimeout(timeout);
		};
	}, []);

	if (loading) {
		return <></>;
	}

	return (
		<div className="app-drag-region flex min-h-screen items-center justify-center">
			<div className="animate-pulse text-center">
				<LoaderIcon
					className={cn(
						'mx-auto size-10 animate-spin text-foreground',
						className,
					)}
				/>
			</div>
		</div>
	);
};

export { Loading };
