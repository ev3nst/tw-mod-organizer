import { TableCell } from '@/components/table';
import { Checkbox } from '@/components/checkbox';

import type { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { modsStore } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';
import { isSeparator } from '@/modlist/utils';

const getChildMods = (
	items: ModItemSeparatorUnion[],
	separatorId: string,
): ModItem[] => {
	let collecting = false;
	const children: ModItem[] = [];

	for (const item of items) {
		if (item.identifier === separatorId) {
			collecting = true;
			continue;
		}
		if (collecting) {
			if (isSeparator(item)) break;
			children.push(item as ModItem);
		}
	}
	return children;
};

const findSeparatorPositions = (
	mods: ModItemSeparatorUnion[],
): { id: string; index: number }[] =>
	mods
		.map((mod, index) =>
			isSeparator(mod) ? { id: mod.identifier, index } : null,
		)
		.filter(Boolean) as { id: string; index: number }[];

export const Selection = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const mods = modsStore(state => state.mods);
	const modActivation = modActivationStore(state => state.data);
	const setModActivation = modActivationStore(state => state.setData);
	const currentSelection = modActivation.find(
		ma => ma.mod_id === mod.identifier,
	);

	const handleSeparatorCheckedChange = () => {
		const currentIndex = mods.findIndex(
			m => m.identifier === mod.identifier,
		);
		const separatorPositions = findSeparatorPositions(mods);
		const nextSeparator = separatorPositions.find(
			sp => sp.id !== mod.identifier && sp.index > currentIndex,
		);
		const nextSeparatorIndex = nextSeparator
			? nextSeparator.index
			: mods.length;
		const sectionItems = mods.slice(
			currentIndex + 1,
			nextSeparatorIndex,
		) as ModItem[];

		const shouldActivate = sectionItems.some(item =>
			modActivation.find(
				ma => ma.mod_id === item.identifier && !ma.is_active,
			),
		);

		const updatedSection = sectionItems.map(item => ({
			mod_id: item.identifier,
			is_active: shouldActivate,
			title: item.title,
		}));

		const updatedModActivation = modActivation.map(item => {
			const updatedItem = updatedSection.find(
				sectionItem => sectionItem.mod_id === item.mod_id,
			);
			return updatedItem ? updatedItem : item;
		});

		setModActivation(updatedModActivation);
	};

	const handleCheckedChange = (checked: boolean) => {
		const updatedModActivation = modActivation.map(item =>
			item.mod_id === mod.identifier
				? { ...item, is_active: checked }
				: item,
		);
		setModActivation(updatedModActivation);
	};

	const cellStyle = {
		backgroundColor: mod.background_color,
		color: mod.text_color,
	};
	const checkboxClass = `
	border-muted-foreground
	data-[state=checked]:bg-green-500
	data-[state=checked]:text-white
	data-[state=checked]:border-green-800
	shadow-none
	h-4 w-4 flex items-center justify-center
	`;

	if (isSeparator(mod)) {
		const childMods = getChildMods(mods, mod.identifier);
		const allActive = childMods.every(
			child =>
				modActivation.find(ma => ma.mod_id === child.identifier)
					?.is_active !== false,
		);

		return (
			<TableCell style={cellStyle}>
				<Checkbox
					className={checkboxClass}
					checked={allActive}
					onCheckedChange={handleSeparatorCheckedChange}
				/>
			</TableCell>
		);
	} else {
		return (
			<TableCell style={cellStyle}>
				<Checkbox
					className={checkboxClass}
					checked={currentSelection?.is_active}
					onCheckedChange={handleCheckedChange}
				/>
			</TableCell>
		);
	}
};
