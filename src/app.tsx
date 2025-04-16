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
import { debounceCallback } from '@/lib/utils';

import { AppData } from './app-data';
import { AppHeader } from './header';
import { AppSidebar } from './sidebar';
import { AppNav } from './nav';

const ModListSortableTable = lazy(() => import('@/modlist'));
const PackViewer = lazy(() => import('@/pack-viewer'));

function AppContent() {
	// some aggressive scroll positioning logic
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const scrollPositionRef = useRef<number | null>(null);
	const scrollAttemptRef = useRef<NodeJS.Timeout | null>(null);
	const scrollAppliedRef = useRef<boolean>(false);

	useEffect(() => {
		const loadScrollPosition = async () => {
			try {
				const setting = await SettingModel.retrieve();
				scrollPositionRef.current = setting.mod_table_scroll;
				attemptApplyScrollPosition();
			} catch (error) {
				console.error('Failed to load scroll position:', error);
			}
		};

		loadScrollPosition();

		return () => {
			if (scrollAttemptRef.current) {
				clearTimeout(scrollAttemptRef.current);
			}
		};
	}, []);

	const attemptApplyScrollPosition = () => {
		if (
			!scrollContainerRef.current ||
			scrollAppliedRef.current ||
			scrollPositionRef.current === null
		) {
			return;
		}

		const container = scrollContainerRef.current;

		if (container.scrollHeight > container.clientHeight) {
			container.scrollTop = scrollPositionRef.current;
			if (
				Math.abs(container.scrollTop - scrollPositionRef.current) < 10
			) {
				scrollAppliedRef.current = true;
				return;
			}
		}

		scrollAttemptRef.current = setTimeout(attemptApplyScrollPosition, 100);
	};

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const mutationObserver = new MutationObserver(() => {
			attemptApplyScrollPosition();
		});

		const resizeObserver = new ResizeObserver(() => {
			attemptApplyScrollPosition();
		});

		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true,
		});
		resizeObserver.observe(container);

		const handleRouteChange = () => {
			scrollAppliedRef.current = false;
			attemptApplyScrollPosition();
		};

		window.addEventListener('popstate', handleRouteChange);

		return () => {
			mutationObserver.disconnect();
			resizeObserver.disconnect();
			window.removeEventListener('popstate', handleRouteChange);
		};
	}, []);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const newPosition = container.scrollTop;
			debounceCallback(async () => {
				const setting = await SettingModel.retrieve();
				setting.mod_table_scroll = newPosition;
				await setting.save();
			}, 500);
		};

		container.addEventListener('scroll', handleScroll);
		return () => container.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<AppData>
			<div
				className="absolute inset-0 overflow-y-auto dark-scrollbar"
				ref={scrollContainerRef}
			>
				<AppNav />
				<Suspense fallback={<Loading />}>
					<Switch>
						<Route path="/" component={ModListSortableTable} />
						<Route path="/pack-viewer" component={PackViewer} />
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
