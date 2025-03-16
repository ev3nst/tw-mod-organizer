import type { Active, Over } from '@dnd-kit/core';

import type { ModItemSeparatorUnion } from '@/lib/api';

export function sortCollapsedSection(
	items: ModItemSeparatorUnion[],
	active: Active,
	over: Over | null,
) {
	const oldIndex = items.findIndex(item => item.identifier === active.id);
	const newIndex = items.findIndex(item => item.identifier === over?.id);

	const separatorPositions = items.reduce(
		(acc, item, index) => {
			if (isSeparator(item)) {
				acc.push({ id: item.identifier, index });
			}
			return acc;
		},
		[] as { id: string; index: number }[],
	);

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
		insertAt = newIndex - sectionSize + 1;
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

export function sortMods(
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

export const isSeparator = (mod: ModItemSeparatorUnion): boolean =>
	!('item_type' in mod);
