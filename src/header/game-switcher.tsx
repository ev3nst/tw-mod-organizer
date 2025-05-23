import { useShallow } from 'zustand/react/shallow';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';

import { SettingModel, settingStore } from '@/lib/store/setting';

export function GameSwitcher() {
	const { games, selectedGame, isGameRunning, shouldLockScreen } =
		settingStore(
			useShallow(state => ({
				games: state.games,
				selectedGame: state.selectedGame,
				isGameRunning: state.isGameRunning,
				shouldLockScreen: state.shouldLockScreen,
			})),
		);

	return (
		<Select
			defaultValue={selectedGame!.slug}
			disabled={isGameRunning || shouldLockScreen}
			onValueChange={async value => {
				const findGame = games.find(f => f.slug === value);
				if (findGame) {
					const setting = await SettingModel.retrieve();
					setting.selected_game = findGame.steam_id;
					await setting.save();
					window.location.reload();
				}
			}}
		>
			<SelectTrigger
				className="clickable-content w-[240px] border-0 shadow-none"
				aria-label="Select Game"
			>
				<SelectValue placeholder="Select a game">
					<span className="ml-2 font-bold">{selectedGame!.name}</span>
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{games.map(game => (
					<SelectItem
						key={`game_switcher_${game.slug}`}
						className="px-5 py-2 text-left"
						value={game.slug}
						disabled={!game.game_path_exists}
					>
						{game.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
