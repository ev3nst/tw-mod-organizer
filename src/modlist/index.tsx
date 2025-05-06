import { useState, useMemo, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
	DndContext,
	closestCenter,
	MouseSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragStartEvent,
} from '@dnd-kit/core';

import { modsStore, type ModItem } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import {
	modActivationStore,
	toggleModActivation,
} from '@/lib/store/mod_activation';
import {
	modSeparatorStore,
	isCollapsed,
	isSeparator,
} from '@/lib/store/mod_separator';
import { filterMods, modMetaStore } from '@/lib/store/mod_meta';

import { settingStore } from '@/lib/store/setting';
import {
	sortMods,
	sortCollapsedSection,
	sortGroup,
	hasCircularDependency,
} from '@/modlist/utils';

import { ModTable } from './table';
import { Filter } from './filter';
import { RowDragOverlay } from './row-drag-overlay';

const ModListSortableTable = () => {
	const [searchModText, setSearchModText] = useState<string>('');
	const [activationFilter, setActivationFilter] = useState<string>('all');
	const [activeId, setActiveId] = useState<string | null>(null);
	const [dependencyViolations, setDependencyViolations] = useState<
		Map<string, Set<string>>
	>(new Map());
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

	const sort_by = settingStore(state => state.sort_by);

	const { mods, setMods, toggleModRemove } = modsStore(
		useShallow(state => ({
			mods: state.mods,
			setMods: state.setMods,
			toggleModRemove: state.toggleModRemove,
		})),
	);

	const {
		modOrderData,
		setModOrder,
		selectedRows,
		setSelectedRows,
		toggleRow,
		clearSelection,
	} = modOrderStore(
		useShallow(state => ({
			modOrderData: state.data,
			setModOrder: state.setData,
			selectedRows: state.selectedRows,
			setSelectedRows: state.setSelectedRows,
			toggleRow: state.toggleRow,
			clearSelection: state.clearSelection,
		})),
	);

	const separators = modSeparatorStore(state => state.data);
	const metaData = modMetaStore(state => state.data);
	const modActiveData = modActivationStore(state => state.data);

	useEffect(() => {
		if (sort_by !== 'load_order') {
			setDependencyViolations(new Map());
			return;
		}

		const actualMods = mods.filter(m => !isSeparator(m)) as ModItem[];
		const violations = new Map<string, Set<string>>();

		const modPositionMap = new Map<string, number>();
		mods.forEach((mod, index) => {
			modPositionMap.set(mod.identifier, index);
		});

		actualMods.forEach(mod => {
			if (
				!mod.required_items ||
				!Array.isArray(mod.required_items) ||
				mod.required_items.length === 0
			) {
				return;
			}

			const childPosition = modPositionMap.get(mod.identifier) || 0;
			mod.required_items.forEach(parentId => {
				if (
					hasCircularDependency(mod.identifier, parentId, actualMods)
				) {
					return;
				}

				const parentPosition = modPositionMap.get(parentId);
				if (parentPosition !== undefined) {
					if (childPosition < parentPosition) {
						if (!violations.has(parentId)) {
							violations.set(parentId, new Set<string>());
						}
						violations.get(parentId)?.add(mod.identifier);
					}
				} else {
					if (!violations.has(parentId)) {
						violations.set(parentId, new Set<string>());
					}
					violations.get(parentId)?.add(mod.identifier);
				}
			});
		});

		setDependencyViolations(violations);
	}, [mods, sort_by]);

	const handleSpaceBar = (event: KeyboardEvent) => {
		const target = event.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.getAttribute('contenteditable') === 'true' ||
			target.isContentEditable
		) {
			return;
		}

		if (event.key === ' ' && selectedRows.size > 0) {
			event.preventDefault();
			const selectedMods = mods.filter(
				f => !isSeparator(f) && selectedRows.has(f.identifier),
			) as ModItem[];
			const shouldActivate = selectedMods.some(item =>
				modActiveData.some(
					ma => ma.mod_id === item.identifier && !ma.is_active,
				),
			);
			for (let mi = 0; mi < selectedMods.length; mi++) {
				const mod = selectedMods[mi];
				toggleModActivation(
					shouldActivate,
					mod,
					selectedMods.length > 1 ? false : true,
				);
			}
		}
	};
	useEffect(() => {
		window.addEventListener('keydown', handleSpaceBar);
		return () => {
			window.removeEventListener('keydown', handleSpaceBar);
		};
	}, [modActiveData, selectedRows]);

	const handleEscKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			clearSelection();
		}
	};
	useEffect(() => {
		window.addEventListener('keydown', handleEscKey);
		return () => {
			window.removeEventListener('keydown', handleEscKey);
		};
	}, []);

	const handleDelete = (event: KeyboardEvent) => {
		if (event.key === 'Delete' && selectedRows.size > 0) {
			event.preventDefault();
			toggleModRemove();
		}
	};
	useEffect(() => {
		window.addEventListener('keydown', handleDelete);
		return () => {
			window.removeEventListener('keydown', handleDelete);
		};
	}, [selectedRows]);

	useEffect(() => {
		if (sort_by !== 'load_order') {
			clearSelection();
		}
	}, [sort_by]);

	const filteredMods = useMemo(
		() =>
			filterMods(
				searchModText,
				activationFilter,
				mods,
				metaData,
				modActiveData,
			),
		[mods, searchModText, activationFilter, metaData, modActiveData],
	);

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

	const selectRange = useCallback(
		(startId: string, endId: string) => {
			const startIndex = modsResolved.findIndex(
				mod => mod.identifier === startId,
			);
			const endIndex = modsResolved.findIndex(
				mod => mod.identifier === endId,
			);

			if (startIndex === -1 || endIndex === -1) return;

			const minIndex = Math.min(startIndex, endIndex);
			const maxIndex = Math.max(startIndex, endIndex);

			const newSelectedRows = new Set<string>();
			for (let i = minIndex; i <= maxIndex; i++) {
				const mod = modsResolved[i];
				if (!isSeparator(mod)) {
					newSelectedRows.add(mod.identifier);
				}
			}

			setSelectedRows(newSelectedRows);
		},
		[modsResolved],
	);

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

				// Delay the state update by one frame
				requestAnimationFrame(() => {
					if (result.modOrder !== modOrderData) {
						setModOrder(result.modOrder);
					}
					if (result.mods !== mods) {
						setMods(result.mods);
					}
				});
			}
		},
		[mods, separators, selectedRows, setModOrder, setMods, modOrderData],
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
		<div className="relative h-full flex-1">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<ModTable
					modsResolved={modsResolved}
					modIndices={modIndices}
					selectedRows={selectedRows}
					toggleRow={toggleRow}
					selectRange={selectRange}
					lastSelectedId={lastSelectedId}
					setLastSelectedId={setLastSelectedId}
					dependencyViolations={dependencyViolations}
				/>

				{activeMod && (
					<RowDragOverlay
						mod={activeMod}
						selectedCount={selectedCount}
					/>
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

export default ModListSortableTable;
