import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
import { ProfileModel } from '@/lib/store/profile-model';
import { modsStore, type ModItem } from '@/lib/store/mods';
import {
	ModActivationModel,
	modActivationStore,
} from '@/lib/store/mod_activation';
import { ModOrderModel, modOrderStore } from '@/lib/store/mod_order';
import { ModMetaModel, modMetaStore } from '@/lib/store/mod_meta';
import { isSeparator } from '@/lib/store/mod_separator';

import { toastError } from '@/lib/utils';

function RemoveModDialog() {
	const { loading, setLoading, selectedGame } = settingStore(
		useShallow(state => ({
			loading: state.loading,
			setLoading: state.setLoading,
			selectedGame: state.selectedGame,
		})),
	);

	const { removeModOpen, toggleModRemove, mods } = modsStore(
		useShallow(state => ({
			removeModOpen: state.removeModOpen,
			toggleModRemove: state.toggleModRemove,
			mods: state.mods,
		})),
	);

	const { modOrderData, selectedRows } = modOrderStore(
		useShallow(state => ({
			modOrderData: state.data,
			selectedRows: state.selectedRows,
		})),
	);

	const modActivationData = modActivationStore(state => state.data);
	const modMetaData = modMetaStore(state => state.data);

	const handleUnsubscribe = useCallback(
		async (modIdentifier: string) => {
			await api.unsubscribe(
				selectedGame!.steam_id,
				Number(modIdentifier),
			);
			toast.success(`Unsubscribed from mod: ${modIdentifier}`);
		},
		[selectedGame!.steam_id],
	);

	const handleDeleteMod = useCallback(
		async (modIdentifier: string) => {
			await api.delete_mod(selectedGame!.steam_id, modIdentifier);
			toast.success(`Deleted mod: ${modIdentifier}`);
		},
		[selectedGame!.steam_id],
	);

	const handleSubmit = async () => {
		try {
			setLoading(true);
			const modsToProcess = Array.from(selectedRows);

			for (const modIdentifier of modsToProcess) {
				const selectedModData = mods.find(
					mod => mod.identifier === modIdentifier,
				);

				if (!selectedModData) continue;
				if (isSeparator(selectedModData)) continue;

				if (
					selectedModData &&
					(selectedModData as ModItem).item_type === 'steam_mod'
				) {
					await handleUnsubscribe(modIdentifier);
				} else {
					await handleDeleteMod(modIdentifier);
				}
			}

			const profile = await ProfileModel.currentProfile(
				selectedGame!.steam_id,
			);

			const modOrder = await ModOrderModel.retrieve(profile.id);
			modOrder!.data = modOrderData.filter(
				mr => modsToProcess.indexOf(mr.mod_id) === -1,
			);
			await modOrder!.save();

			const modActivation = await ModActivationModel.retrieve(profile.id);
			modActivation!.data = modActivationData.filter(
				mr => modsToProcess.indexOf(mr.mod_id) === -1,
			);
			await modActivation!.save();

			const modMeta = await ModMetaModel.retrieve(
				undefined,
				selectedGame!.steam_id,
			);
			modMeta!.data = modMetaData.filter(
				mr => modsToProcess.indexOf(mr.mod_id) === -1,
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
			open={removeModOpen && selectedRows.size > 0}
			onOpenChange={() => toggleModRemove()}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Remove Mod(s)</div>
						<div className="text-sm text-blue-500">
							{`${selectedRows.size} Mods Selected`}
						</div>
					</DialogTitle>
					<DialogDescription
						className="mt-1 break-all text-xs text-sky-700"
						asChild
					>
						<div>
							{[...selectedRows].map(sr => (
								<div
									className="mt-1"
									key={`mod_to_remove_${sr}`}
								>
									{mods.find(m => m.identifier === sr)?.title}
								</div>
							))}
						</div>
					</DialogDescription>
				</DialogHeader>
				<div className="text-sm">
					Are you sure you want to remove the selected mod(s)? If the
					mod is within the Steam workshop, it will be unsubscribed,
					but if it is locally installed, it will be moved to trash.
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

export default RemoveModDialog;
