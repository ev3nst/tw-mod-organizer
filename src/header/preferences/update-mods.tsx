import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
} from '@/components/dialog';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modsStore, type ModItem } from '@/lib/store/mods';
import { isSeparator } from '@/lib/store/mod_separator';
import { toastError } from '@/lib/utils';

export function UpdateMods() {
	const [loading, setLoading] = useState(false);
	const [progress, setProgress] = useState(0);

	const selectedGame = settingStore(state => state.selectedGame);
	const mods = modsStore(state => state.mods);

	const onlySteamMods = useMemo(
		() =>
			mods.filter(
				m =>
					!isSeparator(m) && (m as ModItem).item_type === 'steam_mod',
			),
		[mods],
	);

	const handleSubmit = async () => {
		setLoading(true);
		setProgress(0);
		try {
			for (let mi = 0; mi < onlySteamMods.length; mi++) {
				await api.update_workshop_item(
					selectedGame!.steam_id,
					Number(onlySteamMods[mi].identifier),
				);
				setProgress(mi + 1);
			}

			toast.success('Process complete.');
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	const progressPercent =
		onlySteamMods.length > 0
			? Math.round((progress / onlySteamMods.length) * 100)
			: 0;

	return (
		<div className="flex flex-col gap-4">
			<DialogHeader>
				<DialogDescription>
					This process will send steam client a request to re-download
					your workshop items for the current game.
				</DialogDescription>
			</DialogHeader>
			<div>Mods: {onlySteamMods.length}</div>
			{loading && (
				<div className="w-full bg-gray-200 rounded h-4 overflow-hidden">
					<div
						className="bg-blue-500 h-4 transition-all"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			)}
			{loading && (
				<div className="text-xs text-center">
					{progress} / {onlySteamMods.length} ({progressPercent}%)
				</div>
			)}
			<div className="text-xs flex flex-col gap-2 max-h-[250px] overflow-y-auto">
				{onlySteamMods.map(sm => (
					<div key={`mod_to_update_${sm.identifier}`}>{sm.title}</div>
				))}
			</div>

			<DialogFooter>
				<Button
					type="button"
					variant="info"
					className={loading ? 'disabled' : ''}
					disabled={loading}
					onClick={handleSubmit}
				>
					Start Update Process
					{loading && <Loading />}
				</Button>
			</DialogFooter>
		</div>
	);
}
