import { useState, useMemo, useCallback } from 'react';
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
import { modSeparatorStore, isCollapsed } from '@/lib/store/mod_separator';
import { filterMods, modMetaStore } from '@/lib/store/mod_meta';

import {
	sortMods,
	sortCollapsedSection,
	isSeparator,
	sortGroup,
} from '@/modlist/utils';

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';
import { Lock } from './lock';
import { Filter } from './filter';

export const ModListTable = () => {
	const [searchModText, setSearchModText] = useState<string>('');
	const [activationFilter, setActivationFilter] = useState<string>('all');
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
	const [activeId, setActiveId] = useState<string | null>(null);

	const mods = modsStore(state => state.mods);
	const separators = modSeparatorStore(state => state.data);
	const setMods = modsStore(state => state.setMods);
	const setModOrder = modOrderStore(state => state.setData);
	const metaData = modMetaStore(state => state.data);
	const modActiveData = modActivationStore(state => state.data);

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

	const handleRowSelect = useCallback((modId: string, ctrlKey: boolean) => {
		setSelectedRows(prevSelected => {
			const newSelected = new Set(prevSelected);

			if (ctrlKey) {
				if (newSelected.has(modId)) {
					newSelected.delete(modId);
				} else {
					newSelected.add(modId);
				}
			} else {
				newSelected.clear();
				newSelected.add(modId);
			}

			return newSelected;
		});
	}, []);

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

			if (active.id !== over?.id && over) {
				const draggedId = active.id as string;
				const draggedItem = mods.find(m => m.identifier === draggedId);
				if (selectedRows.has(draggedId) && selectedRows.size > 1) {
					const result = sortGroup(mods, selectedRows, over);
					setModOrder(result.modOrder);
					setMods(result.mods);
				} else {
					let result;
					if (
						draggedItem &&
						isSeparator(draggedItem) &&
						isCollapsed(separators, draggedId)
					) {
						result = sortCollapsedSection(mods, active, over);
					} else {
						result = sortMods(mods, active, over);
					}

					setModOrder(result.modOrder);
					setMods(result.mods);
				}
			}
		},
		[mods, separators, selectedRows, setModOrder, setMods],
	);

	const itemIds = useMemo(() => mods.map(mod => mod.identifier), [mods]);
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
					<Table className="w-full">
						<Header />
						<TableBody className="text-sm">
							<SortableContext
								items={itemIds}
								strategy={verticalListSortingStrategy}
							>
								{modsResolved.map(mod => (
									<Row
										key={mod.identifier}
										mod={mod}
										modIndex={
											modIndices.get(mod.identifier) ?? -1
										}
										id={mod.identifier}
										isSelected={selectedRows.has(
											mod.identifier,
										)}
										onSelect={handleRowSelect}
									/>
								))}
							</SortableContext>
						</TableBody>
						<Footer length={mods.length} />
						<Lock />
					</Table>
				</div>

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
												{selectedCount > 1 && (
													<div className="bg-blue-700 text-white text-xs px-2 py-1 rounded-full">
														+{selectedCount - 1}{' '}
														more
													</div>
												)}
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					)}
				</DragOverlay>
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
