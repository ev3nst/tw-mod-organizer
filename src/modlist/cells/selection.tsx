import { TableCell } from '@/components/table';
import { Checkbox } from '@/components/checkbox';

import type { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { modsStore } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';

export const Selection = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const mods = modsStore(state => state.mods);
	const mod_activation = modActivationStore(state => state.data);
	const setModActivation = modActivationStore(state => state.setData);
	const currentSelection = mod_activation.find(
		f => f.mod_id === mod.identifier,
	);

	const handleSeparatorCheckedChange = () => {
		const separatorPositions = findSeparatorPositions(mods);
		const findIndex = mods.findIndex(f => f.identifier === mod.identifier);
		const breakLine = separatorPositions.find(
			sp => sp.id !== mod.identifier && sp.index > findIndex,
		);
		const breakIndex = breakLine ? breakLine.index : null;

		const toToggle = mods.filter(
			(_, mi) => mi > findIndex && (!breakIndex || mi < breakIndex),
		) as ModItem[];

		const hasPassive = mod_activation.some(
			ma =>
				toToggle.some(f => f.identifier === ma.mod_id) && !ma.is_active,
		);

		const updatedSection = toToggle.map(t => ({
			mod_id: t.identifier,
			is_active: hasPassive,
			title: t.title,
		}));

		const updatedModActivation = mod_activation.map(item => {
			const updatedItem = updatedSection.find(
				sectionItem => sectionItem.mod_id === item.mod_id,
			);
			return updatedItem ? updatedItem : item;
		});

		setModActivation(updatedModActivation);
	};

	const handleCheckedChange = (checked: boolean) => {
		const updatedModActivation = mod_activation.map(item =>
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

	const item_type = 'item_type' in mod ? mod.item_type : 'separator';
	return (
		<TableCell style={cellStyle}>
			<Checkbox
				className="border-muted-foreground data-[state=checked]:bg-green-500 data-[state=checked]:text-white data-[state=checked]:border-green-800 shadow-none"
				checked={currentSelection?.is_active}
				onCheckedChange={
					item_type === 'separator'
						? handleSeparatorCheckedChange
						: handleCheckedChange
				}
			/>
		</TableCell>
	);
};

const findSeparatorPositions = (mods: ModItemSeparatorUnion[]) => {
	return mods
		.map((mod, index) =>
			!('item_type' in mod) ? { id: mod.identifier, index } : null,
		)
		.filter(Boolean) as { id: string; index: number }[];
};
