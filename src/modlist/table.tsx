import { useState, useMemo, useCallback, ChangeEvent } from 'react';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SearchIcon } from 'lucide-react';

import { Table, TableBody } from '@/components/table';
import { Input } from '@/components/input';

import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modSeparatorStore, isCollapsed } from '@/lib/store/mod_separator';

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';
import { Lock } from './lock';
import { sortMods, sortCollapsedSection } from './utils';

export const ModListTable = () => {
	const [searchModText, setSearchModText] = useState<string>('');

	const mods = modsStore(state => state.mods);
	const separators = modSeparatorStore(state => state.data);
	const setMods = modsStore(state => state.setMods);
	const setModOrder = modOrderStore(state => state.setData);

	const filteredMods = useMemo(() => {
		if (searchModText !== '') {
			return mods.filter(m =>
				m.title
					.toLowerCase()
					.includes(searchModText.toLocaleLowerCase()),
			);
		}
		return mods;
	}, [mods, searchModText]);

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

	const sensors = useSensors(useSensor(PointerSensor));

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

	const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
		setSearchModText(event.currentTarget.value);

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
						disabled={searchModText !== ''}
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
			<div className="fixed bottom-0 left-0 right-0 bg-background w-full">
				<SearchIcon className="absolute left-3 bottom-[12px] w-3.5 h-3.5 text-muted-foreground" />
				<Input
					className="rounded-none ps-9 h-10 border-l-0 border-r-0"
					placeholder="Search ..."
					defaultValue={searchModText}
					onChange={handleSearchChange}
				/>
			</div>
		</DndContext>
	);
};
