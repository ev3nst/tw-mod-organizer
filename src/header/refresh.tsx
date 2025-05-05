import { useShallow } from 'zustand/react/shallow';
import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

export const Refresh = () => {
	const {
		loading,
		isGameRunning,
		shouldLockScreen,
		init_reload,
		setInitReload,
	} = settingStore(
		useShallow(state => ({
			loading: state.loading,
			isGameRunning: state.isGameRunning,
			shouldLockScreen: state.shouldLockScreen,
			init_reload: state.init_reload,
			setInitReload: state.setInitReload,
		})),
	);

	const handleRefresh = () => {
		try {
			setInitReload(!init_reload);
		} catch (error) {
			toastError(error);
		}
	};

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
