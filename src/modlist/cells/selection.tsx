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

export const Selection = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const mods = modsStore(state => state.mods);
	const modActivation = modActivationStore(state => state.data);
	const currentSelection = modActivation.find(
		ma => ma.mod_id === mod.identifier,
	);

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
			<TableCell className="select-none" style={cellStyle}>
				<Checkbox
					className={checkboxClass}
					checked={allActive}
					onCheckedChange={() => toggleSeparatorActivation(mod)}
				/>
			</TableCell>
		);
	} else {
		return (
			<TableCell className="select-none" style={cellStyle}>
				<Checkbox
					className={checkboxClass}
					checked={currentSelection?.is_active}
					onCheckedChange={checked =>
						toggleModActivation(checked as boolean, mod as ModItem)
					}
				/>
			</TableCell>
		);
	}
};
