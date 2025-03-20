import { LockIcon } from 'lucide-react';

import { settingStore } from '@/lib/store/setting';

export const Lock = () => {
	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);
	if (!isGameRunning && !shouldLockScreen) return;

	return (
		<div className="absolute left-0 right-0 bottom-0 top-0 bg-background/70 flex justify-center items-center select-none hover:cursor-not-allowed">
			<LockIcon className="w-10 h-10" />
		</div>
	);
};
