import {
	lazy,
	Suspense,
	useEffect,
	useState,
	useCallback,
	useRef,
} from 'react';
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

import { SettingModel } from '@/lib/store/setting';

import { AppData } from './app-data';
import { AppHeader } from './header';
import { AppSidebar } from './sidebar';
import { AppNav } from './nav';

const ModListSortableTable = lazy(() => import('@/modlist'));
const PackViewer = lazy(() => import('@/pack/viewer'));
const PackFilesTree = lazy(() => import('@/pack/files-tree'));
const PackConflicts = lazy(() => import('@/pack/conflicts'));

function AppContent() {
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const scrollPositionRef = useRef<number>(0);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const restoreScrollPosition = useCallback(async () => {
		try {
			const setting = await SettingModel.retrieve();
			scrollPositionRef.current = setting.mod_table_scroll || 0;

			requestAnimationFrame(() => {
				if (scrollContainerRef.current) {
					scrollContainerRef.current.scrollTop =
						scrollPositionRef.current;
				}
			});
		} catch (error) {
			console.error('Failed to load scroll position:', error);
		}
	}, []);

	const handleScroll = useCallback(
		async (e: React.UIEvent<HTMLDivElement>) => {
			const position = e.currentTarget.scrollTop;

			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}

			scrollTimeoutRef.current = setTimeout(async () => {
				try {
					const setting = await SettingModel.retrieve();
					setting.mod_table_scroll = position;
					await setting.save();
				} catch (error) {
					console.error('Failed to save scroll position:', error);
				}
			}, 100);
		},
		[],
	);

	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, []);

	return (
		<AppData onContentLoaded={restoreScrollPosition}>
			<div
				className="absolute inset-0 overflow-y-auto dark-scrollbar"
				ref={scrollContainerRef}
				onScroll={handleScroll}
			>
				<AppNav />
				<Suspense fallback={<Loading />}>
					<Switch>
						<Route path="/" component={ModListSortableTable} />
						<Route path="/pack-viewer" component={PackViewer} />
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
	);
}

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
					<AppHeader />
					<div className="flex flex-1">
						<SidebarInset>
							<AppContent />
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
