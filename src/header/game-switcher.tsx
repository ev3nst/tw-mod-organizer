import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';

import { settingStore } from '@/lib/store/setting';

export function GameSwitcher() {
	const games = settingStore(state => state.games);
	const selectedGame = settingStore(state => state.selectedGame);
	const setSelectedGame = settingStore(state => state.setSelectedGame);
	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);

	return (
		<Select
			defaultValue={selectedGame!.slug}
			disabled={isGameRunning || shouldLockScreen}
			onValueChange={value => {
				const findGame = games.find(f => f.slug === value);
				if (findGame) {
					setSelectedGame(undefined);
					setTimeout(() => {
						setSelectedGame(findGame);
					}, 100);
				}
			}}
		>
			<SelectTrigger
				className="clickable-content border-0 w-[240px]"
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
