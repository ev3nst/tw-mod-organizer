import { lazy, Suspense, useEffect, useState, useCallback } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/sidebar';
import { TooltipProvider } from '@/components/tooltip';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { ProfileModel } from '@/lib/store/profile-model';

import { toastError } from '@/lib/utils';

const ConflictDetailsDialog = lazy(() => import('@/dialogs/conflict-details'));
const SetPriorityDialog = lazy(() => import('@/dialogs/set-priority'));
const MetaInformationDialog = lazy(() => import('@/dialogs/meta-information'));
const RemoveModDialog = lazy(() => import('@/dialogs/remove-mod'));
const EditSeparatorDialog = lazy(() => import('@/dialogs/edit-separator'));
const BulkCategoryUpdateDialog = lazy(
	() => import('@/dialogs/bulk-category-update'),
);
const RequiredItemsDialog = lazy(() => import('@/dialogs/required-items'));
const SaveFileDetailsDialog = lazy(() => import('@/dialogs/save-file-details'));

import { Header } from './header';
import { ModList } from './modlist';
import { AppSidebar } from './sidebar';
import { Lock } from './lock';

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
	}, [init]);

	if (fetchAppManageLoading) return <Loading />;

	return (
		<div className="[--header-height:calc(theme(spacing.14))] h-screen w-screen overflow-hidden">
			<TooltipProvider>
				<SidebarProvider className="flex flex-col" defaultOpen>
					<Header />
					<div className="flex flex-1">
						<SidebarInset>
							<ModList />
							<Lock />
							<Suspense fallback={<Loading />}>
								<ConflictDetailsDialog />
								<SetPriorityDialog />
								<MetaInformationDialog />
								<EditSeparatorDialog />
								<RemoveModDialog />
								<BulkCategoryUpdateDialog />
								<RequiredItemsDialog />
								<SaveFileDetailsDialog />
							</Suspense>
						</SidebarInset>
						<AppSidebar />
					</div>
				</SidebarProvider>
			</TooltipProvider>
		</div>
	);
}

export default App;
