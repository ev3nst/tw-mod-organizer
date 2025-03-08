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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (loading) {
		return <></>;
	}

	return (
		<div className="flex items-center justify-center min-h-screen app-drag-region">
			<div className="text-center animate-pulse">
				<LoaderIcon
					className={cn(
						'animate-spin w-10 h-10 text-foreground mx-auto',
						className,
					)}
				/>
			</div>
		</div>
	);
};

export { Loading };
