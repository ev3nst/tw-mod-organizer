import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import { conflictsStore } from '@/lib/store/conflict';
import { modOrderStore } from '@/lib/store/mod_order';
import type { ModItemSeparatorUnion } from '@/lib/api';

export const Conflict = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const pack_file_path =
		'pack_file_path' in mod ? mod.pack_file_path : undefined;
	if (!pack_file_path) return;

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

	if (conflicts[pack_file_path]) {
		const currentModOrder = mod_order.find(
			m => m.mod_id === mod.identifier,
		);
		const modPackFilePaths = Object.keys(conflicts[pack_file_path]);
		for (let mpi = 0; mpi < modPackFilePaths.length; mpi++) {
			const modPackFilePath = modPackFilePaths[mpi];
			const findMod = mod_order.find(
				mr => mr.pack_file_path === modPackFilePath,
			);
			if (findMod!.order < currentModOrder!.order) {
				win.total +=
					conflicts[pack_file_path][modPackFilePath as any].length;
				win.cases[findMod!.title] =
					conflicts[pack_file_path][modPackFilePath as any];
			} else {
				lose.total +=
					conflicts[pack_file_path][modPackFilePath as any].length;
				lose.cases[findMod!.title] =
					conflicts[pack_file_path][modPackFilePath as any];
			}
		}
	}

	if (toggle_conflict) {
		return (
			<TableCell
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
};
