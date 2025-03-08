import { create } from 'zustand';

import { PackConflicts } from '@/lib/api';

type ConflictStore = {
	conflicts: PackConflicts;
	currentConflict?: string;
	currentConflictData?: any;
	setConflicts: (conflicts: PackConflicts) => void;
	setCurrentConflict: (
		currentConflict?: string,
		currentConflictData?: any,
	) => void;
};

export const conflictsStore = create<ConflictStore>(set => ({
	conflicts: {},
	currentConflict: undefined,
	currentConflictData: undefined,
	setConflicts: conflicts => set({ conflicts }),
	setCurrentConflict: (currentConflict, currentConflictData) =>
		set({ currentConflict, currentConflictData }),
}));
