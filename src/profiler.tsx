import { useState, useEffect, useRef, ReactNode, FC } from 'react';
import { Profiler as ReactProfiler } from 'react';

type ProfilerProps = {
	children: ReactNode;
	enableProfiling: boolean;
};

const Profiler: FC<ProfilerProps> = ({ children, enableProfiling }) => {
	const [durations, setDurations] = useState({
		actualDuration: 0,
		baseDuration: 0,
		count: 0,
	});

	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const onRender = (
		_id: string,
		phase: 'mount' | 'update' | 'nested-update',
		actualDuration: number,
		baseDuration: number,
		_startTime: number,
		_commitTime: number,
	) => {
		if (phase === 'update') {
			setDurations(prevDurations => ({
				actualDuration: prevDurations.actualDuration + actualDuration,
				baseDuration: prevDurations.baseDuration + baseDuration,
				count: prevDurations.count + 1,
			}));
		}
	};

	const calculateAndLogAverages = () => {
		const { actualDuration, baseDuration, count } = durations;
		if (count > 0) {
			const avgActualDuration = actualDuration / count;
			const avgBaseDuration = baseDuration / count;

			console.log('Average Actual Duration (ms):', avgActualDuration);
			console.log('Average Base Duration (ms):', avgBaseDuration);
		}
	};

	useEffect(() => {
		if (enableProfiling) {
			timerRef.current = setTimeout(() => {
				calculateAndLogAverages();
			}, 8000);
		}

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [durations, enableProfiling]);

	if (enableProfiling) {
		return (
			<ReactProfiler id="Table" onRender={onRender}>
				{children}
			</ReactProfiler>
		);
	}

	return <>{children}</>;
};

export default Profiler;
