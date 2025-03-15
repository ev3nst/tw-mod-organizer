import { useCallback } from 'react';
import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

export const Refresh = () => {
	const loading = settingStore(state => state.loading);
	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);
	const init_reload = settingStore(state => state.init_reload);
	const setInitReload = settingStore(state => state.setInitReload);

	const handleRefresh = useCallback(() => {
		try {
			setInitReload(!init_reload);
		} catch (error) {
			toastError(error);
		} finally {
		}
	}, []);

	return (
		<Button
			variant="ghost"
			className={`clickable-content ${
				isGameRunning || shouldLockScreen || loading ? 'disabled' : ''
			}`}
			disabled={isGameRunning || shouldLockScreen || loading}
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
