import { useEffect, useState, useCallback } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/sidebar';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { ProfileModel, profileStore } from '@/lib/store/profile';

import { toastError } from '@/lib/utils';

import { Header } from './header';
import { ModList } from './modlist';
import { AppSidebar } from './sidebar';
import { ConflictDetails } from './conflict-details';
import { SetPriorityDialog } from './set-priority';
import { RemoveModDialog } from './remove-mod';

function App() {
	const [fetchAppManageLoading, setFetchAppManageLoading] = useState(true);

	const setLoading = settingStore(state => state.setLoading);
	const selectedGame = settingStore(state => state.selectedGame);

	const setProfile = profileStore(state => state.setProfile);
	const setProfiles = profileStore(state => state.setProfiles);

	const init = useCallback(async () => {
		try {
			const profile = await ProfileModel.currentProfile(
				selectedGame!.steam_id,
			);
			setProfile(profile);

			const profiles = await ProfileModel.all(selectedGame!.steam_id);
			setProfiles(profiles);
		} catch (error) {
			toastError(error);
		} finally {
			setFetchAppManageLoading(false);
			setLoading(false);
		}
	}, [selectedGame!.steam_id]);

	useEffect(() => {
		init();

		// Prevent CTRL + F from opening the browser search
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey && event.key === 'f') {
				event.preventDefault();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [init]);

	if (fetchAppManageLoading) return <Loading />;

	return (
		<div className="[--header-height:calc(theme(spacing.14))] h-screen w-screen overflow-hidden">
			<SidebarProvider className="flex flex-col" defaultOpen>
				<Header />
				<div className="flex flex-1">
					<SidebarInset>
						<ModList />
						<ConflictDetails />
						<SetPriorityDialog />
						<RemoveModDialog />
					</SidebarInset>
					<AppSidebar />
				</div>
			</SidebarProvider>
		</div>
	);
}

export default App;
