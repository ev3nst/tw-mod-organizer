import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';
import { TableHead } from '@/components/table';

import { profileStore } from '@/lib/store/profile';

import { ProfileDialog } from './profile-dialog';
import { DeleteProfile } from './delete-profile';

export const ProfileSwitcher = () => {
	const profile = profileStore(state => state.profile);
	const profiles = profileStore(state => state.profiles);

	const onGameChange = async (value: string) => {
		const findProfile = profiles.find(f => f.name === value);
		if (findProfile) {
			await findProfile.setActive();
			window.location.reload();
		}
	};

	return (
		<TableHead className="px-0">
			<div className="flex justify-between gap-2 text-foreground">
				<Select
					defaultValue={profile.name}
					onValueChange={onGameChange}
				>
					<SelectTrigger
						className="clickable-content border-0 flex-grow px-0 shadow-none"
						aria-label="Select Game"
					>
						<SelectValue placeholder="Select a game">
							<span className="ml-2 font-bold">
								Profile: {profile.name}
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
					<ProfileDialog />
					<DeleteProfile />
				</div>
			</div>
		</TableHead>
	);
};
