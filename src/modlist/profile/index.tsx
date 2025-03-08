import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';
import { TableHead } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';

import { AddProfile } from './add-profile';
import { DeleteProfile } from './delete-profile';

export const ProfileSwitcher = () => {
	const profile = profileStore(state => state.profile);
	const profiles = profileStore(state => state.profiles);
	const selectedGame = settingStore(state => state.selectedGame);

	return (
		<TableHead>
			<div className="flex justify-between gap-2">
				<Select
					defaultValue={profile.name}
					onValueChange={async value => {
						const findProfile = profiles.find(
							f => f.name === value,
						);
						if (findProfile) {
							await findProfile.setActive(selectedGame!.steam_id);
							window.location.reload();
						}
					}}
				>
					<SelectTrigger
						className="clickable-content border-0 w-[240px]"
						aria-label="Select Game"
					>
						<SelectValue placeholder="Select a game">
							<span className="ml-2 font-bold">
								{profile.name}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{profiles.map(profile => (
							<SelectItem
								key={`profile_switcher_${profile.id}`}
								className="px-5 py-2 text-left"
								value={profile.name}
							>
								{profile.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="flex gap-1 items-center">
					<DeleteProfile />
					<AddProfile />
				</div>
			</div>
		</TableHead>
	);
};
