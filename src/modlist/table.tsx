import { useState, useMemo, useCallback, ChangeEvent } from 'react';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	Active,
	Over,
} from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SearchIcon } from 'lucide-react';

import { Table, TableBody } from '@/components/table';
import { Input } from '@/components/input';

import type { ModItemSeparatorUnion } from '@/lib/api';

import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modSeparatorStore, isCollapsed } from '@/lib/store/mod_separator';

import { Header } from './header';
import { Row } from './row';
import { Footer } from './footer';
import { Lock } from './lock';

export const ModListTable = () => {
	const [searchModText, setSearchModText] = useState<string>('');

	const mods = modsStore(state => state.mods);

	const separators = modSeparatorStore(state => state.data);

	const setMods = modsStore(state => state.setMods);
	const setModOrder = modOrderStore(state => state.setData);

	const lowerSearchText = useMemo(
		() => searchModText.toLowerCase(),
		[searchModText],
	);

	const modsResolved = useMemo(() => {
		if (lowerSearchText !== '') {
			return mods.filter(m =>
				m.title.toLowerCase().includes(lowerSearchText),
			);
		}

		const separatorPositions: { id: string; index: number }[] = [];
		mods.forEach((mod, index) => {
			if (!('item_type' in mod)) {
				separatorPositions.push({ id: mod.identifier, index });
			}
		});

		const hiddenItems = new Set<string>();
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
					hiddenItems.add(mods[j].identifier);
				}
			}
		}

		return mods.filter(mod => !hiddenItems.has(mod.identifier));
	}, [mods, separators, lowerSearchText]);

	const sensors = useSensors(useSensor(PointerSensor));
	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (active.id !== over?.id) {
				const draggedItem = mods.find(m => m.identifier === active.id);
				const isSeparator =
					draggedItem && !('item_type' in draggedItem);

				if (
					isSeparator &&
					isCollapsed(separators, active.id as string)
				) {
					const result = sortCollapsedSection(mods, active, over);
					setModOrder(result.modOrder);
					setMods(result.mods);
				} else {
					const result = sortMods(mods, active, over);
					setModOrder(result.modOrder);
					setMods(result.mods);
				}
			}
		},
		[mods, separators],
	);

	const handleSearchChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setSearchModText(event.currentTarget.value);
		},
		[],
	);

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
						items={mods.map(mod => mod.identifier)}
						strategy={verticalListSortingStrategy}
					>
						{modsResolved.map(mod => (
							<Row
								key={mod.identifier}
								mod={mod}
								modIndex={mods.findIndex(
									mf => mf.identifier === mod.identifier,
								)}
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

function sortCollapsedSection(
	items: ModItemSeparatorUnion[],
	active: Active,
	over: Over | null,
) {
	const oldIndex = items.findIndex(item => item.identifier === active.id);
	const newIndex = items.findIndex(item => item.identifier === over?.id);

	const separatorPositions: { id: string; index: number }[] = [];
	items.forEach((item, index) => {
		if (!('item_type' in item)) {
			separatorPositions.push({ id: item.identifier, index });
		}
	});

	const activeSepIdx = separatorPositions.findIndex(
		sep => sep.id === active.id,
	);
	const nextSepIdx =
		activeSepIdx < separatorPositions.length - 1
			? separatorPositions[activeSepIdx + 1].index
			: items.length;

	const sectionSize = nextSepIdx - oldIndex;
	const newArray = [...items];
	const movedSection = newArray.splice(oldIndex, sectionSize);

	let insertAt = newIndex;
	if (newIndex > oldIndex) {
		insertAt -= sectionSize;
	}

	newArray.splice(insertAt, 0, ...movedSection);
	return {
		modOrder: newArray.map((na, ni) => ({
			mod_id: na.identifier,
			order: ni + 1,
			title: na.title,
			pack_file_path:
				'pack_file_path' in na ? na.pack_file_path : undefined,
		})),
		mods: newArray,
	};
}

function sortMods(
	items: ModItemSeparatorUnion[],
	active: Active,
	over: Over | null,
) {
	const oldIndex = items.findIndex(item => item.identifier === active.id);
	const newIndex = items.findIndex(item => item.identifier === over?.id);

	const newArray = [...items];
	const [movedItem] = newArray.splice(oldIndex, 1);
	newArray.splice(newIndex, 0, movedItem);

	return {
		modOrder: newArray.map((na, ni) => ({
			mod_id: na.identifier,
			order: ni + 1,
			title: na.title,
			pack_file_path:
				'pack_file_path' in na ? na.pack_file_path : undefined,
		})),
		mods: newArray,
	};
}
