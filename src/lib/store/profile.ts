import { create } from 'zustand';

import type { ProfileModel } from '@/lib/store/profile-model';

type ProfileStore = {
	profile: ProfileModel;
	profiles: ProfileModel[];
	setProfile: (profile: ProfileModel) => void;
	setProfiles: (profiles: ProfileModel[]) => void;
};

export const profileStore = create<ProfileStore>(set => ({
	profile: {
		id: 1,
		name: 'default',
		is_active: true,
	} as any,
	profiles: [],
	setProfile: profile => set({ profile }),
	setProfiles: profiles => set({ profiles }),
}));
