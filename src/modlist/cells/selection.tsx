import { memo, useMemo, useCallback } from 'react';

import { Checkbox } from '@/components/checkbox';

import { ModItem, modsStore } from '@/lib/store/mods';
import {
	modActivationStore,
	toggleModActivation,
	toggleSeparatorActivation,
} from '@/lib/store/mod_activation';
import {
	getChildMods,
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

const selectionCheckboxClass = `
	border-muted-foreground
	data-[state=checked]:text-white

	dark:data-[state=checked]:bg-green-500
	dark:data-[state=checked]:border-green-800

	data-[state=checked]:bg-primary
	data-[state=checked]:border-primary/80

	shadow-none
	h-4 w-4 flex items-center justify-center
	`;

export const Selection = memo(
	({ mod }: { mod: ModItemSeparatorUnion }) => {
		const mods = modsStore(state => state.mods);
		const modActivation = modActivationStore(state => state.data);
		const currentSelection = useMemo(
			() => modActivation.find(ma => ma.mod_id === mod.identifier),
			[modActivation, mod.identifier],
		);

		if (isSeparator(mod)) {
			const { childMods, allActive } = useMemo(() => {
				const children = getChildMods(mods, mod.identifier);
				const active = children.every(
					child =>
						modActivation.find(ma => ma.mod_id === child.identifier)
							?.is_active !== false,
				);
				return { childMods: children, allActive: active };
			}, [mods, mod.identifier, modActivation]);

			const handleSeparatorToggle = useCallback(() => {
				toggleSeparatorActivation(mod);
			}, [mod.identifier]);

			return (
				<div
					className="flex select-none items-center justify-center"
					style={TABLE_DIMENSIONS.SELECTION}
				>
					<Checkbox
						className={selectionCheckboxClass}
						checked={childMods.length > 0 && allActive}
						onCheckedChange={handleSeparatorToggle}
					/>
				</div>
			);
		} else {
			const { isBaseAndAlwaysActive, isChecked } = useMemo(
				() => ({
					isBaseAndAlwaysActive:
						(mod as ModItem).item_type === 'base_mod' &&
						mod.identifier !== 'BirthAndDeath',
					isChecked:
						(mod as ModItem).item_type === 'base_mod' &&
						mod.identifier !== 'BirthAndDeath'
							? true
							: currentSelection?.is_active,
				}),
				[mod.identifier, currentSelection],
			);

			const handleModToggle = useCallback(
				(checked: boolean) => {
					toggleModActivation(checked, mod as ModItem);
				},
				[mod],
			);
			return (
				<div
					className="flex select-none items-center justify-center"
					style={TABLE_DIMENSIONS.SELECTION}
				>
					<Checkbox
						className={
							isBaseAndAlwaysActive
								? undefined
								: selectionCheckboxClass
						}
						checked={isChecked}
						disabled={isBaseAndAlwaysActive}
						onCheckedChange={handleModToggle}
					/>
				</div>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
