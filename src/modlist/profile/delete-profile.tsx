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

import { profileStore } from '@/lib/store/profile';
import { toastError } from '@/lib/utils';

export const DeleteProfile = () => {
	const [processLoading, setProcessLoading] = useState<boolean>(false);
	const profile = profileStore(state => state.profile);

	const handleSubmit = async () => {
		setProcessLoading(true);
		try {
			if (profile.id === 1 || profile.name === 'Default') {
				toast.error('Default profile cannot be deleted.');
				return;
			}

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
