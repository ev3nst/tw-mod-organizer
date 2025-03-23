import { create } from 'zustand';

import type { ModConflicts } from '@/lib/api';

type ConflictStore = {
	conflicts: ModConflicts;
	currentConflict?: string;
	currentConflictData?: any;
	setConflicts: (conflicts: ModConflicts) => void;
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
