import { TableCell } from '@/components/table';
import { Checkbox } from '@/components/checkbox';

import type { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
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
	const dependency_confirmation = settingStore(
		state => state.dependency_confirmation,
	);
	const mods = modsStore(state => state.mods);
	const modActivation = modActivationStore(state => state.data);
	const setModActivation = modActivationStore(state => state.setData);
	const currentSelection = modActivation.find(
		ma => ma.mod_id === mod.identifier,
	);

	const setRequiredItemsModal = modActivationStore(
		state => state.setRequiredItemsModal,
	);
	const setRequiredItemsMod = modActivationStore(
		state => state.setRequiredItemsMod,
	);

	const processDependencies = (
		modId: string,
		shouldActivate: boolean,
		updatedActivation: typeof modActivation,
	) => {
		const currentMod = mods.find(m => m.identifier === modId) as ModItem;
		if (!currentMod || isSeparator(currentMod)) return updatedActivation;

		let result = [...updatedActivation];

		if (!shouldActivate && currentMod.item_type === 'steam_mod') {
			const dependentMods = mods.filter(
				otherMod =>
					!isSeparator(otherMod) &&
					(otherMod as ModItem).required_items.includes(modId) &&
					result.some(
						ma =>
							ma.is_active === true &&
							ma.mod_id === otherMod.identifier,
					),
			) as ModItem[];

			if (dependentMods.length > 0) {
				const dependentModIds = dependentMods.map(dm => dm.identifier);
				result = result.map(item => {
					if (dependentModIds.includes(item.mod_id)) {
						return { ...item, is_active: false };
					}
					return item;
				});
			}
		}

		if (
			shouldActivate &&
			currentMod.item_type === 'steam_mod' &&
			currentMod.required_items.length > 0
		) {
			const missingDependencies = currentMod.required_items.filter(
				requiredId =>
					result.some(
						ma =>
							ma.mod_id === requiredId && ma.is_active === false,
					),
			);

			if (missingDependencies.length > 0) {
				result = result.map(item => {
					if (missingDependencies.includes(item.mod_id)) {
						return { ...item, is_active: true };
					}
					return item;
				});
			}
		}

		return result;
	};

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

		let updatedModActivation = [...modActivation];
		sectionItems.forEach(item => {
			updatedModActivation = updatedModActivation.map(activation =>
				activation.mod_id === item.identifier
					? { ...activation, is_active: shouldActivate }
					: activation,
			);
		});

		sectionItems.forEach(item => {
			updatedModActivation = processDependencies(
				item.identifier,
				shouldActivate,
				updatedModActivation,
			);
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

		let currentMod = mod as ModItem;
		if (!checked && currentMod.item_type === 'steam_mod') {
			const dependentMods = mods.filter(
				otherMod =>
					!isSeparator(otherMod) &&
					(otherMod as ModItem).required_items.includes(
						mod.identifier,
					) &&
					updatedModActivation.some(
						ma =>
							ma.is_active === true &&
							ma.mod_id === otherMod.identifier,
					),
			) as ModItem[];

			const hasDependentMods = dependentMods.length > 0;
			if (hasDependentMods) {
				if (dependency_confirmation) {
					setRequiredItemsModal(true);
					setRequiredItemsMod(currentMod);
					return;
				} else {
					const dependentModIds = dependentMods.map(
						dm => dm.identifier,
					);
					const dependencyResolved = updatedModActivation.map(
						item => {
							if (dependentModIds.includes(item.mod_id)) {
								return { ...item, is_active: false };
							}
							return item;
						},
					);

					setModActivation(dependencyResolved);
					return;
				}
			}
		}

		if (
			checked &&
			currentMod.item_type === 'steam_mod' &&
			currentMod.required_items.length > 0
		) {
			const missingDependencies = currentMod.required_items.filter(
				requiredId =>
					updatedModActivation.some(
						ma =>
							ma.mod_id === requiredId && ma.is_active === false,
					),
			);

			if (missingDependencies.length > 0) {
				if (dependency_confirmation) {
					setRequiredItemsModal(true);
					setRequiredItemsMod(currentMod);
					return;
				} else {
					const dependencyResolved = updatedModActivation.map(
						item => {
							if (missingDependencies.includes(item.mod_id)) {
								return { ...item, is_active: true };
							}
							return item;
						},
					);

					setModActivation(dependencyResolved);
					return;
				}
			}
		}
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
