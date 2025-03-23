import { MinusIcon, PlusIcon } from 'lucide-react';

import { TableCell } from '@/components/table';

import {
	modSeparatorStore,
	isCollapsed,
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { memo } from 'react';

export const Order = memo(
	({ mod, modIndex }: { mod: ModItemSeparatorUnion; modIndex: number }) => {
		const separators = modSeparatorStore(state => state.data);
		const toggleCollapse = modSeparatorStore(state => state.toggleCollapse);

		if (isSeparator(mod)) {
			const cellStyle = {
				backgroundColor: mod.background_color,
				color: mod.text_color,
			};

			const modCollapsed = isCollapsed(separators, mod.identifier);

			return (
				<TableCell className="select-none w-[40px]" style={cellStyle}>
					<div
						className="flex items-center justify-center hover:cursor-pointer hover:opacity-70"
						onClick={() => toggleCollapse(mod.identifier)}
					>
						{modCollapsed ? (
							<PlusIcon className="w-4 h-4" />
						) : (
							<MinusIcon className="w-4 h-4" />
						)}
					</div>
				</TableCell>
			);
		} else {
			return (
				<TableCell className="select-none w-[40px]">
					<div className="flex items-center justify-center select-none">
						<em className="text-muted-foreground">
							{modIndex + 1}
						</em>
					</div>
				</TableCell>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.modIndex === nextProps.modIndex,
);
