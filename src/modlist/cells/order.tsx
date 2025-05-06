import { useShallow } from 'zustand/react/shallow';
import { MinusIcon, PlusIcon } from 'lucide-react';

import {
	modSeparatorStore,
	isCollapsed,
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { memo } from 'react';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

export const Order = memo(
	({ mod, modIndex }: { mod: ModItemSeparatorUnion; modIndex: number }) => {
		const { separators, toggleCollapse } = modSeparatorStore(
			useShallow(state => ({
				separators: state.data,
				toggleCollapse: state.toggleCollapse,
			})),
		);

		if (isSeparator(mod)) {
			const modCollapsed = isCollapsed(separators, mod.identifier);

			return (
				<div className="select-none" style={TABLE_DIMENSIONS.ORDER}>
					<div
						className="flex items-center justify-center hover:cursor-pointer hover:opacity-70"
						onClick={() => toggleCollapse(mod.identifier)}
					>
						{modCollapsed ? (
							<PlusIcon className="size-4" />
						) : (
							<MinusIcon className="size-4" />
						)}
					</div>
				</div>
			);
		} else {
			return (
				<div
					className="flex select-none items-center justify-center"
					style={TABLE_DIMENSIONS.ORDER}
				>
					<em className="text-muted-foreground">{modIndex + 1}</em>
				</div>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.modIndex === nextProps.modIndex,
);
