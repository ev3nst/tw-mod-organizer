import { useEffect, useState } from 'react';

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/card';
import { Loading } from '@/components/loading';
import { WindowActions } from '@/header/window-actions';

import { settingStore } from '@/lib/store/setting';

const GameSelector = () => {
	const [loading, setLoading] = useState(true);

	const games = settingStore(state => state.games);
	const steam_library_paths = settingStore(
		state => state.steam_library_paths,
	);
	const setSelectedGame = settingStore(state => state.setSelectedGame);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setLoading(false);
		}, 300);

		return () => {
			clearTimeout(timeout);
		};
	}, []);

	const gamesRender = games.map(gameDetails => {
		const gameImage = (
			<img
				alt={gameDetails.name}
				className="w-full object-cover h-[300px] rounded-lg transition-all hover:scale-105 hover:cursor-pointer"
				src={`/${gameDetails.slug}.jpg`}
				style={{
					filter: gameDetails.game_path_exists
						? ''
						: 'grayscale(100%)',
				}}
				onClick={() => {
					setSelectedGame(gameDetails);
				}}
			/>
		);

		return (
			<Card
				className="flex flex-col h-full border-0 flex-1 max-w-[320px]"
				key={`welcome_${gameDetails.steam_id}_${gameDetails.slug}`}
			>
				<CardHeader className="py-4">
					<CardTitle>{gameDetails.name}</CardTitle>
				</CardHeader>
				<CardContent className="pb-3">{gameImage}</CardContent>
				<CardFooter className="pb-4">
					<span className="text-xs text-muted-foreground">
						{steam_library_paths.game_install_paths[
							gameDetails.slug
						]
							? steam_library_paths.game_install_paths[
									gameDetails.slug
								]
							: 'Not Installed'}
					</span>
				</CardFooter>
			</Card>
		);
	});

	if (loading) {
		return <Loading timeoutMs={0} />;
	}

	return (
		<main>
			<div className="flex justify-between app-drag-region border-b fixed top-0 left-0 right-0 py-1">
				<div className="flex items-center gap-4 py-1 px-3">
					<img src="/logo.png" className="h-6 w-6" />
					<div className="text-sm font-bold">Modulus</div>
				</div>
				<WindowActions className="px-1" />
			</div>
			<div className="flex flex-col justify-center w-screen h-screen">
				<div className="flex gap-3 px-10 justify-center">
					{gamesRender}
				</div>
			</div>
		</main>
	);
};

export default GameSelector;
