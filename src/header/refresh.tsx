import { useCallback } from 'react';
import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

export const Refresh = () => {
	const loading = settingStore(state => state.loading);
	const selectedGame = settingStore(state => state.selectedGame);
	const setSelectedGame = settingStore(state => state.setSelectedGame);
	const isGameRunning = settingStore(state => state.isGameRunning);

	const handleRefresh = useCallback(() => {
		try {
			const sg = { ...selectedGame };
			setSelectedGame(undefined);
			setTimeout(() => setSelectedGame(sg as any), 100);
		} catch (error) {
			toastError(error);
		} finally {
		}
	}, []);

	return (
		<Button
			variant="ghost"
			className={`clickable-content ${
				isGameRunning || loading ? 'disabled' : ''
			}`}
			disabled={isGameRunning || loading}
			onClick={handleRefresh}
		>
			{loading ? (
				<Loading className="m-0" timeoutMs={100} />
			) : (
				<RefreshCwIcon className="text-green-500" />
			)}
			Refresh
		</Button>
	);
};
