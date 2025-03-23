import { memo } from 'react';

import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import { conflictsStore } from '@/lib/store/conflict';
import { modOrderStore } from '@/lib/store/mod_order';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

export const Conflict = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		if (isSeparator(mod)) return;

		const mod_file_path =
			'mod_file_path' in mod ? mod.mod_file_path : undefined;
		if (!mod_file_path) return <TableCell>&nbsp;</TableCell>;

		const toggle_conflict = settingStore(state => state.toggle_conflict);
		const conflicts = conflictsStore(state => state.conflicts);
		const setCurrentConflict = conflictsStore(
			state => state.setCurrentConflict,
		);
		const mod_order = modOrderStore(state => state.data);

		let win: any = {
			cases: {},
			total: 0,
		};
		let lose: any = {
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
					if (findMod!.order < currentModOrder!.order) {
						win.total +=
							conflicts[mod_file_path][modFilePath as any].length;
						win.cases[findMod!.title] =
							conflicts[mod_file_path][modFilePath as any];
					} else {
						lose.total +=
							conflicts[mod_file_path][modFilePath as any].length;
						lose.cases[findMod!.title] =
							conflicts[mod_file_path][modFilePath as any];
					}
				}
			}
		}

		if (toggle_conflict) {
			if (win.total === 0 && lose.total === 0) return <TableCell />;

			return (
				<TableCell
					className="w-[80px]"
					onClick={() => {
						setCurrentConflict(mod.identifier, {
							mod,
							win,
							lose,
						});
					}}
				>
					<div className="flex gap-1 text-center justify-center hover:cursor-pointer hover:opacity-80">
						{win.total > 0 && (
							<span className="text-green-500 text-xs">
								{win.total}
							</span>
						)}
						{lose.total > 0 && (
							<span className="text-red-500 text-xs">
								{lose.total}
							</span>
						)}
					</div>
				</TableCell>
			);
		}
		return null;
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
