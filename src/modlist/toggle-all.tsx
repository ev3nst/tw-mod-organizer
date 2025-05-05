import { useShallow } from 'zustand/react/shallow';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/alert-dialog';
import { Checkbox } from '@/components/checkbox';

import { modActivationStore } from '@/lib/store/mod_activation';

export const ToggleAll = () => {
	const { mod_activation, setModActivation } = modActivationStore(
		useShallow(state => ({
			mod_activation: state.data,
			setModActivation: state.setData,
		})),
	);

	const hasPassive = mod_activation.some(mod => !mod.is_active);
	const toggleMods = () => {
		const updatedMods = mod_activation.map(mod => ({
			...mod,
			is_active: hasPassive,
		}));
		setModActivation(updatedMods);
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Checkbox aria-label="Toggle All" checked={!hasPassive} />
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Toggle Mods</AlertDialogTitle>
					<AlertDialogDescription>
						If all mods are passive, this action will turn them
						active. If any of them is active, it will turn them
						passive.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={toggleMods}>
						Change
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
