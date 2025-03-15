import { useState, useMemo, useCallback } from 'react';
import {
	DndContext,
	closestCenter,
	MouseSensor,
	useSensor,
	useSensors,
	DragEndEvent,
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

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';
import { Lock } from './lock';
import { Filter } from './filter';

import { sortMods, sortCollapsedSection } from './utils';

export const ModListTable = () => {
	const [searchModText, setSearchModText] = useState<string>('');
	const [activationFilter, setActivationFilter] = useState<string>('all');

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
			if (!('item_type' in mod)) {
				positions.push({ id: mod.identifier, index });
			}
		});
		return positions;
	}, [mods]);

	const hiddenItems = useMemo(() => {
		if (searchModText !== '') return new Set<string>();

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
	}, [mods, separatorPositions, separators, searchModText]);

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

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (active.id !== over?.id) {
				const draggedItem = mods.find(m => m.identifier === active.id);
				const isSeparator =
					draggedItem && !('item_type' in draggedItem);

				let result;
				if (
					isSeparator &&
					isCollapsed(separators, active.id as string)
				) {
					result = sortCollapsedSection(mods, active, over);
				} else {
					result = sortMods(mods, active, over);
				}

				setModOrder(result.modOrder);
				setMods(result.mods);
			}
		},
		[mods, separators, setModOrder, setMods],
	);

	const itemIds = useMemo(() => mods.map(mod => mod.identifier), [mods]);
	const modIndices = useMemo(() => {
		const indices = new Map<string, number>();
		mods.forEach((mod, index) => {
			indices.set(mod.identifier, index);
		});
		return indices;
	}, [mods]);

	return (
		<div className="relative flex-1 mb-[41px]">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
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
									/>
								))}
							</SortableContext>
						</TableBody>
						<Footer length={mods.length} />
						<Lock />
					</Table>
				</div>
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
