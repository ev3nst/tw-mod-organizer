import { memo, useCallback, useMemo } from 'react';
import { GripVerticalIcon } from 'lucide-react';

import { settingStore } from '@/lib/store/setting';
import { modOrderStore } from '@/lib/store/mod_order';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

export const Sort = memo(
	({
		attributes,
		listeners,
		id,
		isSelected,
		onSelect,
		setLastSelectedId,
	}: any) => {
		const selectedRows = modOrderStore(state => state.selectedRows);
		const sort_by = settingStore(state => state.sort_by);
		const isSortingEnabled = sort_by === 'load_order';

		const handlePointerDown = useCallback(
			(_e: React.PointerEvent) => {
				if (isSortingEnabled && selectedRows.size <= 1) {
					onSelect(id, false);
					setLastSelectedId(id);
				}
			},
			[
				isSortingEnabled,
				isSelected,
				id,
				onSelect,
				setLastSelectedId,
				selectedRows,
			],
		);

		const sortableProps = useMemo(
			() => ({
				...(isSortingEnabled ? attributes : {}),
				...(isSortingEnabled ? listeners : {}),
			}),
			[isSortingEnabled, attributes, listeners],
		);

		return (
			<div
				onPointerDown={handlePointerDown}
				className={`justify-center select-none ${
					isSortingEnabled ? 'cursor-move' : 'cursor-default'
				}`}
				style={TABLE_DIMENSIONS.SORTING}
				{...sortableProps}
			>
				<div className="flex items-center justify-center h-full relative">
					<GripVerticalIcon
						className={`h-4 w-4 text-muted-foreground dark:text-primary/60 ${
							isSortingEnabled ? '' : 'opacity-50'
						}`}
					/>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.hasViolation === nextProps.hasViolation &&
		prevProps.attributes === nextProps.attributes &&
		prevProps.listeners === nextProps.listeners,
);
