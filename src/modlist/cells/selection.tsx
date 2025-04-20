import { memo } from 'react';

import { TableCell } from '@/components/table';
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
		const currentSelection = modActivation.find(
			ma => ma.mod_id === mod.identifier,
		);

		if (isSeparator(mod)) {
			const childMods = getChildMods(mods, mod.identifier);
			const allActive = childMods.every(
				child =>
					modActivation.find(ma => ma.mod_id === child.identifier)
						?.is_active !== false,
			);

			return (
				<TableCell className="select-none w-[40px]">
					<Checkbox
						className={selectionCheckboxClass}
						checked={childMods.length > 0 && allActive}
						onCheckedChange={() => toggleSeparatorActivation(mod)}
					/>
				</TableCell>
			);
		} else {
			const isBaseAndAlwaysActive =
				(mod as ModItem).item_type === 'base_mod' &&
				mod.identifier !== 'BirthAndDeath';
			return (
				<TableCell className="select-none w-[40px]">
					<Checkbox
						className={
							isBaseAndAlwaysActive
								? undefined
								: selectionCheckboxClass
						}
						checked={
							isBaseAndAlwaysActive
								? isBaseAndAlwaysActive
								: currentSelection?.is_active
						}
						disabled={isBaseAndAlwaysActive}
						onCheckedChange={checked =>
							toggleModActivation(
								checked as boolean,
								mod as ModItem,
							)
						}
					/>
				</TableCell>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier,
);
