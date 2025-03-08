import { type ChangeEvent, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';

import { settingStore } from '@/lib/store/setting';
import { ProfileModel } from '@/lib/store/profile';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModActivationModel } from '@/lib/store/mod_activation';
import { profileStore } from '@/lib/store/profile';
import { toastError } from '@/lib/utils';

export const AddProfile = () => {
	const [processLoading, setProcessLoading] = useState<boolean>(false);
	const [profileName, setProfileName] = useState<string>('');
	const [copyModListStructure, setCopyModListStructure] =
		useState<boolean>(true);
	const [switchToNew, setSwitchToNew] = useState<boolean>(true);

	const selectedGame = settingStore(state => state.selectedGame);
	const profile = profileStore(state => state.profile);
	const profiles = profileStore(state => state.profiles);
	const setProfile = profileStore(state => state.setProfile);
	const setProfiles = profileStore(state => state.setProfiles);

	const handleProfileName = (event: ChangeEvent<HTMLInputElement>) => {
		setProfileName(event.currentTarget.value);
	};

	const handleSubmit = async () => {
		setProcessLoading(true);
		try {
			let sanitizedProfileName = profileName.trim();
			const findDuplicateName = profiles.find(
				p =>
					p.name === sanitizedProfileName &&
					p.app_id === selectedGame!.steam_id,
			);
			if (findDuplicateName) {
				toast.error(
					`Profile with name: ${sanitizedProfileName} already exists.`,
				);
				return;
			}

			const newProfile = new ProfileModel({
				id: undefined as any,
				name: sanitizedProfileName,
				app_id: selectedGame!.steam_id,
				is_active: false,
			});
			await newProfile.save();

			if (copyModListStructure === true) {
				const modActivation = await ModActivationModel.retrieve(
					profile.id,
				);
				const newModActivation = new ModActivationModel({
					id: undefined as any,
					profile_id: newProfile.id,
					app_id: selectedGame!.steam_id,
					data:
						modActivation && modActivation.data
							? modActivation.data
							: [],
				});
				await newModActivation.save();

				const modOrder = await ModOrderModel.retrieve(profile.id);
				const newModOrder = new ModOrderModel({
					id: undefined as any,
					profile_id: newProfile.id,
					app_id: selectedGame!.steam_id,
					data: modOrder && modOrder.data ? modOrder.data : [],
				});
				await newModOrder.save();
			}

			const newProfilesArr = [...profiles];
			newProfilesArr.push(newProfile);
			setProfiles(newProfilesArr);

			if (switchToNew) {
				await newProfile.setActive(selectedGame!.steam_id);
				setProfile(newProfile);
			}

			if (!copyModListStructure) {
				window.location.reload();
			}

			toast.success('Profile creation successful.');
			setProfileName('');
		} catch (error) {
			toastError(error);
		} finally {
			setProcessLoading(false);
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="w-7 h-7">
					<PlusIcon />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Profile</DialogTitle>
					<DialogDescription>
						Name of the profile must be unique.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="flex flex-col gap-3 mb-3">
						<Label htmlFor="name">
							Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							value={profileName}
							onChange={handleProfileName}
							autoComplete="off"
							className="col-span-3"
						/>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="copy_modlist_structure"
							checked={copyModListStructure}
							onCheckedChange={checked =>
								setCopyModListStructure(checked as any)
							}
						/>
						<label
							htmlFor="copy_modlist_structure"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Copy the current mod list structure
						</label>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="switch_to_new"
							checked={switchToNew}
							onCheckedChange={checked =>
								setSwitchToNew(checked as any)
							}
						/>
						<label
							htmlFor="switch_to_new"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Switch to new profile after its creation
						</label>
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="info"
						className={
							processLoading ||
							profileName === null ||
							profileName.trim() === ''
								? 'disabled'
								: ''
						}
						disabled={
							processLoading ||
							profileName === null ||
							profileName.trim() === ''
						}
						onClick={handleSubmit}
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
