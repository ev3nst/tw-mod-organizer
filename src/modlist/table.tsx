import { memo } from 'react';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Table, TableBody } from '@/components/table';

import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';

type ModTableProps = {
	totalMods: number;
	modsResolved: ModItemSeparatorUnion[];
	modIndices: Map<string, number>;
	selectedRows: Set<string>;
	toggleRow: (modId: string, ctrlKey: boolean) => void;
	selectRange: (startId: string, endId: string) => void;
	lastSelectedId: string | null;
	setLastSelectedId: (id: string | null) => void;
};

export const ModTable: React.FC<ModTableProps> = memo(
	({
		totalMods,
		modsResolved,
		modIndices,
		selectedRows,
		toggleRow,
		selectRange,
		lastSelectedId,
		setLastSelectedId,
	}) => {
		return (
			<Table className="w-full">
				<Header />
				<TableBody className="text-sm">
					<SortableContext
						items={modsResolved.map(mod => mod.identifier)}
						strategy={verticalListSortingStrategy}
					>
						{modsResolved.map(mod => (
							<Row
								key={mod.identifier}
								mod={mod}
								modIndex={modIndices.get(mod.identifier) ?? -1}
								id={mod.identifier}
								isSelected={selectedRows.has(mod.identifier)}
								onSelect={toggleRow}
								selectRange={selectRange}
								lastSelectedId={lastSelectedId}
								setLastSelectedId={setLastSelectedId}
							/>
						))}
					</SortableContext>
				</TableBody>
				<Footer modCount={totalMods} />
			</Table>
		);
	},
);
