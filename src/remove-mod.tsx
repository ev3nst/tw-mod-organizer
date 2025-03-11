import { useCallback } from 'react';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Button } from '@/components/button';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { ProfileModel } from '@/lib/store/profile';
import { modsStore } from '@/lib/store/mods';
import {
	ModActivationModel,
	modActivationStore,
} from '@/lib/store/mod_activation';
import { ModOrderModel, modOrderStore } from '@/lib/store/mod_order';
import { ModMetaModel, modMetaStore } from '@/lib/store/mod_meta';

import { toastError } from '@/lib/utils';

export function RemoveModDialog() {
	const loading = settingStore(state => state.loading);
	const setLoading = settingStore(state => state.setLoading);
	const selectedGame = settingStore(state => state.selectedGame);

	const removeModOpen = modsStore(state => state.removeModOpen);
	const selectedMod = modsStore(state => state.selectedMod);
	const toggleModRemove = modsStore(state => state.toggleModRemove);

	const modOrderData = modOrderStore(state => state.data);
	const modActivationData = modActivationStore(state => state.data);
	const modMetaData = modMetaStore(state => state.data);

	const handleUnsubscribe = useCallback(async () => {
		await api.unsubscribe(
			selectedGame!.steam_id,
			Number(selectedMod.identifier),
		);
		toast.success('Unsubscribed.');
	}, [selectedGame!.steam_id, selectedMod.identifier]);

	const handleDeleteMod = useCallback(async () => {
		await api.delete_mod(selectedGame!.steam_id, selectedMod.identifier);
		toast.success('Deleted.');
	}, [selectedGame!.steam_id, selectedMod.identifier]);

	const handleSubmit = async () => {
		try {
			setLoading(true);
			if (selectedMod.item_type === 'steam_mod') {
				await handleUnsubscribe();
			} else {
				await handleDeleteMod();
			}

			const profile = await ProfileModel.currentProfile(
				selectedGame!.steam_id,
			);

			const modOrder = await ModOrderModel.retrieve(profile.id);
			modOrder!.data = [...modOrderData].filter(
				mr => mr.mod_id !== selectedMod.identifier,
			);
			await modOrder!.save();

			const modActivation = await ModActivationModel.retrieve(profile.id);
			modActivation!.data = [...modActivationData].filter(
				mr => mr.mod_id !== selectedMod.identifier,
			);
			await modActivation!.save();

			const modMeta = await ModMetaModel.retrieve(
				undefined,
				selectedGame!.steam_id,
			);
			modMeta!.data = [...modMetaData].filter(
				mr => mr.mod_id !== selectedMod.identifier,
			);
			await modMeta!.save();

			setTimeout(() => {
				window.location.reload();
			}, 150);
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog
			open={removeModOpen && typeof selectedMod !== 'undefined'}
			onOpenChange={() => toggleModRemove()}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Remove Mod</div>
						<div className="text-sm text-blue-500">
							{selectedMod.title}
						</div>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all text-sky-700">
						{selectedMod?.pack_file}
					</DialogDescription>
				</DialogHeader>
				<div>
					Are you sure you want to remove this mod ? If mod is within
					steam workshop it will be unsubscribed but if mod is locally
					installed then it will be moved to trash.
				</div>
				<Button
					type="button"
					variant="destructive"
					className={loading ? 'disabled' : ''}
					disabled={loading}
					onClick={handleSubmit}
				>
					Delete
				</Button>
			</DialogContent>
		</Dialog>
	);
}
