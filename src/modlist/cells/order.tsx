import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { TableCell } from '@/components/table';

import { ModItemSeparatorUnion } from '@/lib/api';
import { modSeparatorStore, isCollapsed } from '@/lib/store/mod_separator';

export const Order = ({
	mod,
	modIndex,
}: {
	mod: ModItemSeparatorUnion;
	modIndex: number;
}) => {
	const item_type = 'item_type' in mod ? mod.item_type : 'separator';
	const separators = modSeparatorStore(state => state.data);
	const toggleCollapse = modSeparatorStore(state => state.toggleCollapse);

	if (item_type === 'separator') {
		const cellStyle = {
			backgroundColor: mod.background_color,
			color: mod.text_color,
		};

		const modCollapsed = isCollapsed(separators, mod.identifier);

		return (
			<TableCell style={cellStyle}>
				<div
					className="flex items-center justify-center hover:cursor-pointer hover:opacity-70"
					onClick={() => toggleCollapse(mod.identifier)}
				>
					{modCollapsed ? (
						<ChevronDownIcon className="w-4 h-4" />
					) : (
						<ChevronUpIcon className="w-4 h-4" />
					)}
				</div>
			</TableCell>
		);
	} else {
		return (
			<TableCell>
				<div className="flex items-center justify-center select-none">
					<em className="text-muted-foreground">{modIndex + 1}</em>
				</div>
			</TableCell>
		);
	}
};
