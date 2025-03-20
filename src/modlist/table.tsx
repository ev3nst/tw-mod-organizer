import { useState, memo, useMemo, useCallback, useEffect } from 'react';
import {
	DndContext,
	closestCenter,
	MouseSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragStartEvent,
	DragOverlay,
} from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Table, TableBody } from '@/components/table';

import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modActivationStore } from '@/lib/store/mod_activation';
import {
	modSeparatorStore,
	isCollapsed,
	isSeparator,
} from '@/lib/store/mod_separator';
import { filterMods, modMetaStore } from '@/lib/store/mod_meta';

import type { ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { sortMods, sortCollapsedSection, sortGroup } from '@/modlist/utils';

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';
import { Lock } from './lock';
import { Filter } from './filter';

export const ModListTable = () => {
	const [searchModText, setSearchModText] = useState<string>('');
	const [activationFilter, setActivationFilter] = useState<string>('all');
	const [activeId, setActiveId] = useState<string | null>(null);

	const sort_by = settingStore(state => state.sort_by);

	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
	const mods = modsStore(state => state.mods);
	const setMods = modsStore(state => state.setMods);

	const modOrderData = modOrderStore(state => state.data);
	const setModOrder = modOrderStore(state => state.setData);
	const selectedRows = modOrderStore(state => state.selectedRows);
	const toggleRow = modOrderStore(state => state.toggleRow);
	const clearSelection = modOrderStore(state => state.clearSelection);

	const separators = modSeparatorStore(state => state.data);
	const metaData = modMetaStore(state => state.data);
	const modActiveData = modActivationStore(state => state.data);

	const selectRange = useCallback(
		(startId: string, endId: string) => {
			const startIndex = mods.findIndex(
				mod => mod.identifier === startId,
			);
			const endIndex = mods.findIndex(mod => mod.identifier === endId);

			if (startIndex === -1 || endIndex === -1) return;

			const minIndex = Math.min(startIndex, endIndex);
			const maxIndex = Math.max(startIndex, endIndex);

			const newSelectedRows = new Set<string>();
			for (let i = minIndex; i <= maxIndex; i++) {
				const mod = mods[i];
				if (!isSeparator(mod)) {
					newSelectedRows.add(mod.identifier);
				}
			}

			modOrderStore.setState({ selectedRows: newSelectedRows });
		},
		[mods],
	);

	const handleEscKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			clearSelection();
		}
	};

	useEffect(() => {
		window.addEventListener('keydown', handleEscKey);
		if (sort_by !== 'load_order') {
			clearSelection();
		}

		return () => {
			window.removeEventListener('keydown', handleEscKey);
		};
	}, [sort_by]);

	const filteredMods = useMemo(() => {
		return filterMods(
			searchModText,
			activationFilter,
			mods,
			metaData,
			modActiveData,
		);
	}, [mods, searchModText, activationFilter]);

	const separatorPositions = useMemo(() => {
		const positions: { id: string; index: number }[] = [];
		mods.forEach((mod, index) => {
			if (isSeparator(mod)) {
				positions.push({ id: mod.identifier, index });
			}
		});
		return positions;
	}, [mods]);

	const hiddenItems = useMemo(() => {
		if (searchModText !== '' || activationFilter !== 'all')
			return new Set<string>();

		const hidden = new Set<string>();
		for (let i = 0; i < separatorPositions.length; i++) {
			const currentSeparator = separatorPositions[i];
			if (isCollapsed(separators, currentSeparator.id)) {
				const nextSeparatorIndex =
					i < separatorPositions.length - 1
						? separatorPositions[i + 1].index
						: mods.length;

				for (
					let j = currentSeparator.index + 1;
					j < nextSeparatorIndex;
					j++
				) {
					hidden.add(mods[j].identifier);
				}
			}
		}
		return hidden;
	}, [mods, separatorPositions, separators, searchModText, activationFilter]);

	const modsResolved = useMemo(() => {
		return filteredMods.filter(mod => !hiddenItems.has(mod.identifier));
	}, [filteredMods, hiddenItems]);

	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				distance: 0.01, // double click bugfix
			},
		}),
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		const { active } = event;
		setActiveId(active.id as string);
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);

			if (!over || active.id === over.id) return;

			const draggedId = active.id as string;
			const draggedItem = mods.find(m => m.identifier === draggedId);

			if (draggedItem) {
				let result;
				if (selectedRows.has(draggedId) && selectedRows.size > 1) {
					result = sortGroup(mods, selectedRows, over);
				} else if (
					isSeparator(draggedItem) &&
					isCollapsed(separators, draggedId)
				) {
					result = sortCollapsedSection(mods, active, over);
				} else {
					result = sortMods(mods, active, over);
				}

				if (result.modOrder !== modOrderData) {
					setModOrder(result.modOrder);
				}
				if (result.mods !== mods) {
					setMods(result.mods);
				}
			}
		},
		[mods, separators, selectedRows, setModOrder, setMods],
	);

	const modIndices = useMemo(() => {
		const indices = new Map<string, number>();
		mods.forEach((mod, index) => {
			indices.set(mod.identifier, index);
		});
		return indices;
	}, [mods]);

	const activeMod = useMemo(() => {
		if (!activeId) return null;
		return mods.find(mod => mod.identifier === activeId);
	}, [activeId, mods]);

	const selectedCount = useMemo(() => {
		if (!activeId) return 0;
		return selectedRows.has(activeId) ? selectedRows.size : 0;
	}, [activeId, selectedRows]);

	return (
		<div className="relative flex-1 mb-[41px]">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="absolute inset-0 overflow-y-auto dark-scrollbar">
					<ModTable
						totalMods={mods.length - separators.length}
						modsResolved={modsResolved}
						modIndices={modIndices}
						selectedRows={selectedRows}
						toggleRow={toggleRow}
						selectRange={selectRange}
						lastSelectedId={lastSelectedId}
						setLastSelectedId={setLastSelectedId}
					/>
				</div>

				{selectedCount > 1 && (
					<DragOverlay>
						{activeId && activeMod && (
							<div className="opacity-80">
								<table className="w-full border-collapse">
									<tbody>
										<tr className="bg-white dark:bg-gray-800 shadow-md rounded-md">
											<td className="border border-gray-200 dark:border-gray-700 p-2">
												<div className="flex items-center gap-2">
													<div className="font-medium text-sm">
														{activeMod.title}
													</div>
													<div className="bg-blue-700 text-white text-xs px-2 py-1 rounded-full">
														+{selectedCount - 1}{' '}
														more
													</div>
												</div>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						)}
					</DragOverlay>
				)}
			</DndContext>
			<Filter
				activationFilter={activationFilter}
				setActivationFilter={setActivationFilter}
				searchModText={searchModText}
				setSearchModText={setSearchModText}
			/>
		</div>
	);
};

interface ModTableProps {
	totalMods: number;
	modsResolved: ModItemSeparatorUnion[];
	modIndices: Map<string, number>;
	selectedRows: Set<string>;
	toggleRow: (modId: string, ctrlKey: boolean) => void;
	selectRange: (startId: string, endId: string) => void;
	lastSelectedId: string | null;
	setLastSelectedId: (id: string | null) => void;
}

const ModTable: React.FC<ModTableProps> = memo(
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
				<Footer length={totalMods} />
				<Lock />
			</Table>
		);
	},
);
