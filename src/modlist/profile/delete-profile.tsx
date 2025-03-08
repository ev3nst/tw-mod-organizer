import { useState } from 'react';
import { XIcon } from 'lucide-react';
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
} from '@/components/alert-dialog';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModActivationModel } from '@/lib/store/mod_activation';

import { toastError } from '@/lib/utils';

export const DeleteProfile = () => {
	const [processLoading, setProcessLoading] = useState<boolean>(false);

	const profile = profileStore(state => state.profile);
	const profiles = profileStore(state => state.profiles);
	const selectedGame = settingStore(state => state.selectedGame);

	const handleSubmit = async () => {
		setProcessLoading(true);
		try {
			if (profile.id === 1 || profile.name === 'Default') {
				toast.error('Default profile cannot be deleted.');
				return;
			}

			let nextInLine;
			for (let pi = 0; pi < profiles.length; pi++) {
				if (profiles[pi].id !== profile.id) {
					nextInLine = profiles[pi];
					break;
				}
			}
			if (nextInLine) {
				await nextInLine.setActive(selectedGame!.steam_id);
			} else {
				toast.error('Could not find any available profile to switch.');
				return;
			}

			const modOrder = await ModOrderModel.retrieve(profile.id);
			await modOrder?.delete();
			const modActivation = await ModActivationModel.retrieve(profile.id);
			await modActivation?.delete();
			await profile.delete();

			toast.success('Profile deleted.');
			setTimeout(() => {
				window.location.reload();
			}, 350);
		} catch (error) {
			toastError(error);
		} finally {
			setProcessLoading(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="ghost" size="icon" className="w-7 h-7">
					<XIcon />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Profile</AlertDialogTitle>
					<AlertDialogDescription>
						<b>{profile.name}</b> will be deleted. This action
						cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						className={processLoading ? 'disabled' : ''}
						disabled={processLoading}
					>
						Cancel
					</AlertDialogCancel>
					<Button
						variant="destructive"
						className={processLoading ? 'disabled' : ''}
						disabled={processLoading}
						onClick={handleSubmit}
					>
						Delete
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
