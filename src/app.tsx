import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Route, Switch } from 'wouter';

import { SidebarInset, SidebarProvider } from '@/components/sidebar';
import { TooltipProvider } from '@/components/tooltip';
import { Loading } from '@/components/loading';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { ProfileModel } from '@/lib/store/profile-model';

import { toastError } from '@/lib/utils';

const ConflictDetailsDialog = lazy(() => import('@/dialogs/conflict-details'));
const SetPriorityDialog = lazy(() => import('@/dialogs/set-priority'));
const SendToSeparatorDialog = lazy(() => import('@/dialogs/send-to-separator'));
const MetaInformationDialog = lazy(() => import('@/dialogs/meta-information'));
const RemoveModDialog = lazy(() => import('@/dialogs/remove-mod'));
const EditSeparatorDialog = lazy(() => import('@/dialogs/edit-separator'));
const BulkCategoryUpdateDialog = lazy(
	() => import('@/dialogs/bulk-category-update'),
);
const RequiredItemsDialog = lazy(() => import('@/dialogs/required-items'));
const SaveFileDetailsDialog = lazy(() => import('@/dialogs/save-file-details'));
const TableManagerDialog = lazy(() => import('@/dialogs/table-manager'));
const VersionTrackingDialog = lazy(() => import('@/dialogs/version-tracking'));

import { AppData } from './app-data';
import { AppHeader } from './header';
import { AppSidebar } from './sidebar';
import { AppNav } from './nav';

const ModListSortableTable = lazy(() => import('@/modlist'));
const PackViewer = lazy(() => import('@/pack/viewer'));
const PackFilesTree = lazy(() => import('@/pack/files-tree'));
const PackConflicts = lazy(() => import('@/pack/conflicts'));

function App() {
	const [fetchAppManageLoading, setFetchAppManageLoading] = useState(true);

	const { setLoading, selectedGame } = settingStore(
		useShallow(state => ({
			setLoading: state.setLoading,
			selectedGame: state.selectedGame,
		})),
	);

	const { setProfile, setProfiles } = profileStore(
		useShallow(state => ({
			setProfile: state.setProfile,
			setProfiles: state.setProfiles,
		})),
	);
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
		<div className="h-screen w-screen overflow-hidden [--header-height:calc(theme(spacing.14))]">
			<TooltipProvider>
				<SidebarProvider className="flex flex-col" defaultOpen>
					<AppHeader />
					<div className="flex flex-1 overflow-hidden">
						<SidebarInset>
							<AppData>
								<div className="h-full overflow-hidden">
									<AppNav />
									<Suspense fallback={<Loading />}>
										<Switch>
											<Route
												path="/"
												component={ModListSortableTable}
											/>
											<Route
												path="/pack-viewer"
												component={PackViewer}
											/>
											<Route
												path="/pack-files-tree"
												component={PackFilesTree}
											/>
											<Route
												path="/pack-conflicts"
												component={PackConflicts}
											/>
										</Switch>
									</Suspense>
								</div>
							</AppData>
							<Suspense fallback={<Loading />}>
								<TableManagerDialog />
								<VersionTrackingDialog />
								<ConflictDetailsDialog />
								<SetPriorityDialog />
								<SendToSeparatorDialog />
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
