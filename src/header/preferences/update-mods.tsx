import { useState } from 'react';
import { toast } from 'sonner';

import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
} from '@/components/dialog';
import { Button } from '@/components/button';

import api, { ModItem } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modsStore } from '@/lib/store/mods';
import { toastError } from '@/lib/utils';
import { Loading } from '@/components/loading';
import { isSeparator } from '@/modlist/utils';

export function UpdateMods() {
	const [loading, setLoading] = useState(false);

	const selectedGame = settingStore(state => state.selectedGame);
	const mods = modsStore(state => state.mods);
	const onlySteamMods = mods.filter(
		m => !isSeparator(m) && (m as ModItem).item_type === 'steam_mod',
	);

	const handleSubmit = async () => {
		setLoading(true);
		try {
			for (let mi = 0; mi < onlySteamMods.length; mi++) {
				await api.update_workshop_item(
					selectedGame!.steam_id,
					Number(onlySteamMods[mi].identifier),
				);
			}

			toast.success('Process complete');
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<DialogHeader>
				<DialogDescription>
					This process will send steam client a request to re-download
					your workshop items for the current game.
				</DialogDescription>
			</DialogHeader>
			<div>Mods: {onlySteamMods.length}</div>
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
