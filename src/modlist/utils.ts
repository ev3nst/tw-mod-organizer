import type { Active, Over } from '@dnd-kit/core';

import type { ModItem } from '@/lib/store/mods';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModActivationModel } from '@/lib/store/mod_activation';
import {
	ModSeparatorModel,
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { ModMetaModel } from '@/lib/store/mod_meta';
import { normalizeOrder } from '@/lib/utils';

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

export function sortGroup(
	items: ModItemSeparatorUnion[],
	selectedRows: Set<string>,
	over: Over | null,
) {
	const modsArray = [...items];
	const selectedModsIds = Array.from(selectedRows);
	const selectedIndices = selectedModsIds
		.map(id => modsArray.findIndex(m => m.identifier === id))
		.sort((a, b) => a - b);

	const targetIndex = modsArray.findIndex(m => m.identifier === over?.id);
	const newModsArray = [...modsArray];
	const selectedItems = selectedIndices.map(index => modsArray[index]);
	const isMovingDown =
		targetIndex > selectedIndices[selectedIndices.length - 1];

	for (let i = selectedIndices.length - 1; i >= 0; i--) {
		newModsArray.splice(selectedIndices[i], 1);
	}

	let insertIndex = newModsArray.findIndex(m => m.identifier === over?.id);
	if (insertIndex === -1) insertIndex = 0;

	if (isMovingDown) {
		insertIndex += 1;
	}

	newModsArray.splice(insertIndex, 0, ...selectedItems);
	const modOrder = newModsArray.map((na, ni) => ({
		mod_id: na.identifier,
		order: ni + 1,
		title: na.title,
		pack_file_path: 'pack_file_path' in na ? na.pack_file_path : undefined,
	}));

	return {
		mods: newModsArray,
		modOrder,
	};
}

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

export const initOrder = async (
	mods: ModItemSeparatorUnion[],
	profileId: number,
	steamId: number,
) => {
	const modOrder = await ModOrderModel.retrieve(profileId);
	if (typeof modOrder !== 'undefined' && modOrder.data !== null) {
		let updatedOrder = [];
		const toAdd = [];
		for (let mi = 0; mi < mods.length; mi++) {
			const mod = mods[mi];
			const currentOrder = modOrder.data.find(
				f => f.mod_id === mod.identifier,
			);

			if (currentOrder) {
				updatedOrder.push({
					mod_id: mod.identifier,
					order: currentOrder.order,
					pack_file_path:
						'pack_file_path' in mod
							? mod.pack_file_path
							: undefined,
					title: mod.title,
				});
			} else {
				toAdd.push({
					mod_id: mod.identifier,
					order: 0,
					pack_file_path:
						'pack_file_path' in mod
							? mod.pack_file_path
							: undefined,
					title: mod.title,
				});
			}
		}

		updatedOrder = normalizeOrder(updatedOrder);
		let updatedOrderLength = updatedOrder.length;
		for (let tai = 0; tai < toAdd.length; tai++) {
			updatedOrderLength++;
			toAdd[tai].order = updatedOrderLength;
		}

		updatedOrder = normalizeOrder([...updatedOrder, ...toAdd]);
		return updatedOrder;
	} else {
		const newOrder = [];
		for (let mi = 0; mi < mods.length; mi++) {
			const mod = mods[mi];
			newOrder.push({
				mod_id: mod.identifier,
				order: mi + 1,
				pack_file_path:
					'pack_file_path' in mod ? mod.pack_file_path : undefined,
				title: mod.title,
			});
		}
		const newModOrder = new ModOrderModel({
			id: null as any,
			profile_id: profileId,
			app_id: steamId,
			data: newOrder,
		});
		await newModOrder.save();
		return newOrder;
	}
};

export const initActivation = async (
	mods: ModItemSeparatorUnion[],
	profileId: number,
	steamId: number,
) => {
	const modActivation = await ModActivationModel.retrieve(profileId);
	if (typeof modActivation !== 'undefined' && modActivation.data !== null) {
		let updatedActivation = [];
		const toAdd = [];
		for (let mi = 0; mi < mods.length; mi++) {
			const mod = mods[mi];
			const currentActivation = modActivation.data.find(
				f => f.mod_id === mod.identifier,
			);
			if (currentActivation) {
				updatedActivation.push({
					mod_id: mod.identifier,
					is_active: currentActivation.is_active,
					title: mod.title,
				});
			} else {
				toAdd.push({
					mod_id: mod.identifier,
					is_active: false,
					title: mod.title,
				});
			}
		}

		for (let tai = 0; tai < toAdd.length; tai++) {
			toAdd[tai].is_active = false;
		}

		updatedActivation = [...updatedActivation, ...toAdd];
		return updatedActivation;
	} else {
		const newActivation = [];
		for (let mi = 0; mi < mods.length; mi++) {
			const mod = mods[mi];
			newActivation.push({
				mod_id: mod.identifier,
				is_active: true,
				title: mod.title,
			});
		}
		const newModActivation = new ModActivationModel({
			id: null as any,
			profile_id: profileId,
			app_id: steamId,
			data: newActivation,
		});
		await newModActivation.save();
		return newActivation;
	}
};

export const initSeparator = async (profileId: number, steamId: number) => {
	const modSeparator = await ModSeparatorModel.retrieve(profileId);
	if (typeof modSeparator !== 'undefined' && modSeparator.data !== null) {
		return modSeparator.data;
	} else {
		const newModSeparator = new ModSeparatorModel({
			id: null as any,
			profile_id: profileId,
			app_id: steamId,
			data: [],
		});
		await newModSeparator.save();
		return [];
	}
};

export const initMeta = async (
	mods: ModItemSeparatorUnion[],
	steamId: number,
) => {
	const modMeta = await ModMetaModel.retrieve(undefined, steamId);
	if (typeof modMeta !== 'undefined' && modMeta.data !== null) {
		let updatedMeta = [];
		for (let mi = 0; mi < mods.length; mi++) {
			const mod = mods[mi] as ModItem;
			if (isSeparator(mod)) continue;

			const currentMeta = modMeta.data.find(
				f => f.mod_id === mod.identifier,
			);
			if (currentMeta) {
				updatedMeta.push({
					mod_id: mod.identifier,
					title: currentMeta.title,
					categories: currentMeta.categories,
					version: currentMeta.version,
				});
			} else {
				updatedMeta.push({
					mod_id: mod.identifier,
					title: '',
					categories: '',
					version: '',
				});
			}
		}

		return updatedMeta;
	} else {
		const newMeta = [];
		for (let mi = 0; mi < mods.length; mi++) {
			const mod = mods[mi] as ModItem;
			if (isSeparator(mod)) continue;

			newMeta.push({
				mod_id: mod.identifier,
				title: '',
				categories: '',
				version: '',
			});
		}
		const newModMeta = new ModMetaModel({
			id: null as any,
			app_id: steamId,
			data: newMeta,
		});
		await newModMeta.save();
		return newMeta;
	}
};
