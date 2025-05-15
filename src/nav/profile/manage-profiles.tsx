import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
	SettingsIcon,
	Pencil,
	Save,
	X,
	Trash2,
	ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/alert-dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Checkbox } from '@/components/checkbox';
import { ScrollArea } from '@/components/scroll-area';
import { Loading } from '@/components/loading';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/tooltip';

import { profileStore } from '@/lib/store/profile';
import { settingStore } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

export const ManageProfiles = () => {
	const { isGameRunning, shouldLockScreen } = settingStore(
		useShallow(state => ({
			isGameRunning: state.isGameRunning,
			shouldLockScreen: state.shouldLockScreen,
			selectedGame: state.selectedGame,
		})),
	);

	const { profile, profiles } = profileStore(
		useShallow(state => ({
			profile: state.profile,
			profiles: state.profiles,
		})),
	);

	const [profileList, setProfileList] = useState<
		Array<{
			id: number;
			name: string;
			originalName: string;
			isActive: boolean;
			isEditing: boolean;
			isSelected: boolean;
			isProtected: boolean;
		}>
	>([]);

	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [selectAll, setSelectAll] = useState(false);
	const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
	const [profilesToDelete, setProfilesToDelete] = useState<number[]>([]);

	useEffect(() => {
		if (isOpen) {
			const formattedProfiles = profiles.map(p => ({
				id: p.id,
				name: p.name,
				originalName: p.name,
				isActive: p.id === profile.id,
				isEditing: false,
				isSelected: false,
				isProtected: p.name === 'Default',
			}));
			setProfileList(formattedProfiles);
			setSelectAll(false);
		}
	}, [isOpen, profiles, profile.id]);

	const handleToggleEdit = (id: number) => {
		const targetProfile = profileList.find(p => p.id === id);

		if (targetProfile?.isProtected) {
			toast.error('The Default profile cannot be modified');
			return;
		}

		setProfileList(prev =>
			prev.map(p => ({
				...p,
				isEditing: p.id === id ? !p.isEditing : p.isEditing,
				name: p.id === id && p.isEditing ? p.originalName : p.name,
			})),
		);
	};

	const handleNameChange = (id: number, newName: string) => {
		setProfileList(prev =>
			prev.map(p => (p.id === id ? { ...p, name: newName } : p)),
		);
	};

	const handleSaveEdit = async (id: number) => {
		const profileToUpdate = profileList.find(p => p.id === id);
		if (!profileToUpdate) return;

		if (profileToUpdate.isProtected) {
			toast.error('The Default profile cannot be modified');
			return;
		}

		if (
			profileToUpdate.name.trim().toLowerCase() === 'default' &&
			profileToUpdate.originalName.toLowerCase() !== 'default'
		) {
			toast.error(
				'The name "Default" is reserved for the system profile',
			);
			return;
		}

		const isDuplicate = profileList.some(
			p =>
				p.id !== id &&
				p.name.toLowerCase() === profileToUpdate.name.toLowerCase(),
		);

		if (isDuplicate) {
			toast.error('Profile name must be unique');
			return;
		}

		if (profileToUpdate.name.trim() === '') {
			toast.error('Profile name cannot be empty');
			return;
		}

		try {
			setIsLoading(true);

			const profileModel = profiles.find(p => p.id === id);
			if (profileModel) {
				profileModel.name = profileToUpdate.name.trim();
				await profileModel.save();

				setProfileList(prev =>
					prev.map(p =>
						p.id === id
							? { ...p, isEditing: false, originalName: p.name }
							: p,
					),
				);
				toast.success('Profile name updated');
			}
		} catch (error) {
			toastError(error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleToggleSelect = (id: number) => {
		const targetProfile = profileList.find(p => p.id === id);

		if (targetProfile?.isProtected) {
			toast.error('The Default profile cannot be deleted');
			return;
		}

		setProfileList(prev => {
			const updated = prev.map(p => ({
				...p,
				isSelected:
					p.id === id && !p.isProtected
						? !p.isSelected
						: p.isSelected,
			}));

			const selectableProfiles = updated.filter(p => !p.isProtected);
			const allSelectableSelected =
				selectableProfiles.length > 0 &&
				selectableProfiles.every(p => p.isSelected);
			setSelectAll(allSelectableSelected);

			return updated;
		});
	};

	const handleSelectAll = () => {
		const newSelectAll = !selectAll;
		setSelectAll(newSelectAll);
		setProfileList(prev =>
			prev.map(p => ({
				...p,
				isSelected:
					newSelectAll && !p.isProtected ? true : p.isSelected,
			})),
		);
	};

	const confirmDeleteSelected = () => {
		const selectedIds = profileList
			.filter(p => p.isSelected && !p.isProtected)
			.map(p => p.id);

		if (selectedIds.length === 0) return;

		const protectedSelected = profileList.some(
			p => p.isSelected && p.isProtected,
		);
		if (protectedSelected) {
			toast.error('The Default profile cannot be deleted');
			return;
		}

		setProfilesToDelete(selectedIds);
		setShowDeleteConfirmation(true);
	};

	const handleDeleteSelected = async () => {
		if (profilesToDelete.length === 0) return;

		try {
			setIsLoading(true);

			for (const id of profilesToDelete) {
				const profileToDelete = profiles.find(p => p.id === id);
				if (profileToDelete && profileToDelete.name !== 'Default') {
					await profileToDelete.delete();
				}
			}

			toast.success(`Deleted ${profilesToDelete.length} profiles`);

			setTimeout(() => {
				window.location.reload();
			}, 200);
		} catch (error) {
			toastError(error);
		} finally {
			setIsLoading(false);
			setShowDeleteConfirmation(false);
		}
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-primary"
						disabled={isGameRunning || shouldLockScreen}
					>
						<SettingsIcon className="size-4" />
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Manage Profiles</DialogTitle>
					</DialogHeader>

					<div className="mb-3 flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="select-all"
								checked={selectAll}
								onCheckedChange={handleSelectAll}
								disabled={profileList.length === 0 || isLoading}
							/>
							<label
								htmlFor="select-all"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Select All
							</label>
						</div>

						<Button
							variant="destructive"
							size="sm"
							onClick={confirmDeleteSelected}
							disabled={
								!profileList.some(p => p.isSelected) ||
								isLoading
							}
							className="flex items-center gap-1"
						>
							<Trash2 className="size-4" />
							Delete Selected
							{isLoading && <Loading />}
						</Button>
					</div>

					<ScrollArea className="h-[300px] pr-4">
						<div className="space-y-2">
							{profileList.length === 0 ? (
								<p className="py-8 text-center text-muted-foreground">
									No profiles found
								</p>
							) : (
								profileList.map(p => (
									<div
										key={p.id}
										className={`
                    flex items-center space-x-2 rounded-md p-2
                    ${
						p.isActive && p.isProtected
							? 'border border-amber-500/40 bg-amber-500/20'
							: p.isProtected
								? 'border border-amber-500/30 bg-amber-500/10'
								: p.isActive
									? 'border border-primary/20 bg-primary/10'
									: 'hover:bg-muted'
					}
                  `}
									>
										<Checkbox
											checked={p.isSelected}
											onCheckedChange={() =>
												handleToggleSelect(p.id)
											}
											disabled={
												p.isProtected || isLoading
											}
										/>

										{p.isEditing ? (
											<div className="flex flex-1 items-center space-x-2">
												<Input
													value={p.name}
													onChange={e =>
														handleNameChange(
															p.id,
															e.target.value,
														)
													}
													className="h-8"
													autoFocus
												/>
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="size-7 text-green-500"
																onClick={() =>
																	handleSaveEdit(
																		p.id,
																	)
																}
																disabled={
																	isLoading
																}
															>
																<Save className="size-4" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															<p>Save</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>

												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="size-7 text-red-500"
																onClick={() =>
																	handleToggleEdit(
																		p.id,
																	)
																}
																disabled={
																	isLoading
																}
															>
																<X className="size-4" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															<p>Cancel</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</div>
										) : (
											<>
												<span className="flex flex-1 items-center truncate">
													{p.name}
													{p.isProtected && (
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger
																	asChild
																>
																	<ShieldAlert className="ml-2 size-4 text-amber-500" />
																</TooltipTrigger>
																<TooltipContent>
																	<p>
																		Protected
																		system
																		profile
																	</p>
																</TooltipContent>
															</Tooltip>
														</TooltipProvider>
													)}
													{p.isActive && (
														<span className="ml-2 text-xs text-primary">
															(Active)
														</span>
													)}
												</span>
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className={`size-7 ${
																	p.isProtected
																		? 'cursor-not-allowed text-muted-foreground'
																		: ''
																}`}
																onClick={() =>
																	handleToggleEdit(
																		p.id,
																	)
																}
																disabled={
																	p.isProtected ||
																	isLoading
																}
															>
																<Pencil className="size-4" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															<p>
																{p.isProtected
																	? 'Cannot edit protected profile'
																	: 'Edit'}
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</>
										)}
									</div>
								))
							)}
						</div>
					</ScrollArea>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsOpen(false)}
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={showDeleteConfirmation}
				onOpenChange={setShowDeleteConfirmation}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Profiles</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{' '}
							{profilesToDelete.length} selected profiles? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteSelected}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
