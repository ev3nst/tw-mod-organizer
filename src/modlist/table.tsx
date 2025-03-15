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
import { modSeparatorStore, isCollapsed } from '@/lib/store/mod_separator';
import { modMetaStore } from '@/lib/store/mod_meta';

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';
import { Lock } from './lock';
import { sortMods, sortCollapsedSection } from './utils';
import { modActivationStore } from '@/lib/store/mod_activation';
import { ModItemSeparatorUnion } from '@/lib/api';
import { Filter } from './filter';

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
		let filteredData: ModItemSeparatorUnion[] = mods;
		if (searchModText !== '') {
			let searchModTextLower = searchModText.toLocaleLowerCase();
			if (searchModTextLower.startsWith('c:')) {
				searchModTextLower = searchModTextLower
					.replace('c:', '')
					.trim();

				const filterMeta = metaData.filter(
					md =>
						md.categories
							.toLowerCase()
							.includes(searchModTextLower) ||
						(typeof md.title !== 'undefined' &&
							md.title
								.toLowerCase()
								.includes(searchModTextLower)),
				);

				filteredData = mods.filter(m => {
					if (!('item_type' in m)) {
						return false;
					}

					if (
						filterMeta.findIndex(f => f.mod_id === m.identifier) !==
						-1
					) {
						return true;
					} else {
						return (
							m.categories !== null &&
							m.categories
								.toLowerCase()
								.includes(searchModTextLower)
						);
					}
				});
			} else {
				const filterMeta = metaData.filter(
					md =>
						typeof md.title !== 'undefined' &&
						md.title.toLowerCase().includes(searchModTextLower),
				);

				filteredData = mods.filter(m => {
					if (!('item_type' in m)) {
						return false;
					}

					if (
						filterMeta.findIndex(f => f.mod_id === m.identifier) !==
						-1
					) {
						return true;
					}

					return (
						m.title.toLowerCase().includes(searchModTextLower) ||
						(m.categories !== null &&
							m.categories
								.toLowerCase()
								.includes(searchModTextLower))
					);
				});
			}
		}

		if (activationFilter !== 'all') {
			filteredData = filteredData.filter(f =>
				modActiveData.some(
					s =>
						s.mod_id === f.identifier &&
						s.is_active === (activationFilter === 'active'),
				),
			);
		}

		return filteredData;
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
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<Table className="mb-10 relative">
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
								modIndex={modIndices.get(mod.identifier) ?? -1}
								id={mod.identifier}
							/>
						))}
					</SortableContext>
				</TableBody>
				<Footer length={mods.length} />
				<Lock />
			</Table>
			<Filter
				activationFilter={activationFilter}
				setActivationFilter={setActivationFilter}
				searchModText={searchModText}
				setSearchModText={setSearchModText}
			/>
		</DndContext>
	);
};
