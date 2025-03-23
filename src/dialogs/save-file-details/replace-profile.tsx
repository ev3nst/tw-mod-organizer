import { toast } from 'sonner';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogAction,
} from '@/components/alert-dialog';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { ProfileModel } from '@/lib/store/profile-model';
import { modsStore } from '@/lib/store/mods';
import { ModActivationModel } from '@/lib/store/mod_activation';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModSeparatorModel } from '@/lib/store/mod_separator';
import { saveFilesStore } from '@/lib/store/save_files';
import { toastError } from '@/lib/utils';

export const ReplaceProfileDialog = () => {
	const selectedGame = settingStore(state => state.selectedGame);
	const selectedSaveFile = saveFilesStore(state => state.selectedSaveFile);

	const mods = modsStore(state => state.mods);

	const missingMods = selectedSaveFile
		? selectedSaveFile.load_order_data.filter(
				lr =>
					!mods.some(m => m.identifier === lr.identifier) &&
					lr.is_active === true &&
					lr.mod_file !== null, // Ignore separators
			)
		: [];

	const profile = profileStore(state => state.profile);

	const handleReplaceProfile = async () => {
		if (!selectedSaveFile || missingMods.length > 0) return;

		try {
			const profiles = await ProfileModel.all(selectedGame!.steam_id);
			const existing = profiles.find(
				p => p.name.toLowerCase() === profile.name.trim().toLowerCase(),
			);
			await existing!.delete();

			const newProfile = new ProfileModel({
				id: undefined as any,
				name: profile.name.trim(),
				app_id: selectedGame!.steam_id,
				is_active: false,
			});
			await newProfile.save();

			const newModOrder = new ModOrderModel({
				id: undefined as any,
				app_id: selectedGame!.steam_id,
				profile_id: newProfile.id,
				data: selectedSaveFile.load_order_data.map(lr => {
					return {
						title: lr.title,
						mod_id: lr.identifier,
						order: lr.order_index,
					};
				}),
			});
			await newModOrder.save();

			const newModActivation = new ModActivationModel({
				id: undefined as any,
				app_id: selectedGame!.steam_id,
				profile_id: newProfile.id,
				data: selectedSaveFile.load_order_data.map(lr => {
					return {
						title: lr.title,
						mod_id: lr.identifier,
						is_active: lr.is_active,
					};
				}),
			});
			await newModActivation.save();

			const newSeparators = new ModSeparatorModel({
				id: undefined as any,
				app_id: selectedGame!.steam_id,
				profile_id: newProfile.id,
				data: selectedSaveFile.load_order_data
					.filter(lr => lr.mod_file === null)
					.map(lr => {
						return {
							identifier: lr.identifier,
							title: lr.title,
							order: lr.order_index,
							background_color: lr.background_color ?? '#262626',
							text_color: lr.text_color ?? '#fefefe',
							collapsed: false,
						};
					}),
			});
			await newSeparators.save();

			await newProfile.setActive();
			toast.success('Process successful.');
			setTimeout(() => {
				window.location.reload();
			}, 500);
		} catch (error) {
			toastError(error);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="outline"
					disabled={missingMods?.length > 0}
					className={missingMods?.length > 0 ? 'disabled' : ''}
				>
					Replace Current Profile
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Replace Profile</AlertDialogTitle>
					<AlertDialogDescription>
						This process will replace everything in your current
						active profile with what the save file has. Are you
						sure?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-red-500 text-white hover:bg-red-700"
						onClick={handleReplaceProfile}
					>
						Replace
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
