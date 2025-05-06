import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { settingStore } from '@/lib/store/setting';
import { conflictsStore } from '@/lib/store/conflict';
import { modOrderStore } from '@/lib/store/mod_order';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

interface ConflictCase {
	cases: Record<string, any[]>;
	total: number;
}

interface ConflictData {
	mod: ModItemSeparatorUnion;
	win: ConflictCase;
	lose: ConflictCase;
}

export const Conflict = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return null;

		const mod_file_path =
			'mod_file_path' in mod ? mod.mod_file_path : undefined;
		if (!mod_file_path) return <div>&nbsp;</div>;

		const toggle_conflict = settingStore(state => state.toggle_conflict);

		const { conflicts, setCurrentConflict } = conflictsStore(
			useShallow(state => ({
				conflicts: state.conflicts,
				setCurrentConflict: state.setCurrentConflict,
			})),
		);

		const mod_order = modOrderStore(state => state.data);

		const { win, lose } = useMemo(() => {
			const win: ConflictCase = {
				cases: {},
				total: 0,
			};
			const lose: ConflictCase = {
				cases: {},
				total: 0,
			};

			if (conflicts[mod_file_path]) {
				const currentModOrder = mod_order.find(
					m => m.mod_id === mod.identifier,
				);
				if (currentModOrder) {
					const modFilePaths = Object.keys(conflicts[mod_file_path]);
					for (let mpi = 0; mpi < modFilePaths.length; mpi++) {
						const modFilePath = modFilePaths[mpi];
						const findMod = mod_order.find(
							mr => mr.mod_file_path === modFilePath,
						);
						if (!findMod) continue;

						const conflictArray =
							conflicts[mod_file_path][modFilePath as any];
						if (!conflictArray) continue;

						if (findMod.order < currentModOrder.order) {
							win.total += conflictArray.length;
							win.cases[findMod.title] = conflictArray;
						} else {
							lose.total += conflictArray.length;
							lose.cases[findMod.title] = conflictArray;
						}
					}
				}
			}

			return { win, lose };
		}, [conflicts, mod_file_path, mod.identifier, mod_order]);

		const handleClick = useCallback(() => {
			setCurrentConflict(mod.identifier, {
				mod,
				win,
				lose,
			} as ConflictData);
		}, [mod, win, lose, setCurrentConflict]);

		if (!toggle_conflict) return null;

		if (win.total === 0 && lose.total === 0)
			return <div style={TABLE_DIMENSIONS.CONFLICT} />;

		return (
			<div
				style={TABLE_DIMENSIONS.CONFLICT}
				onClick={handleClick}
				className="flex items-center justify-center"
			>
				<div className="flex items-center justify-center gap-1 text-center hover:cursor-pointer hover:opacity-80">
					{win.total > 0 && (
						<span className="text-xs text-green-500">
							{win.total}
						</span>
					)}
					{lose.total > 0 && (
						<span className="text-xs text-red-500">
							{lose.total}
						</span>
					)}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
