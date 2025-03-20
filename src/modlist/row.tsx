import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';

import { TableCell, TableRow } from '@/components/table';

import type { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { isSeparator } from '@/lib/store/mod_separator';

import { Selection } from './cells/selection';
import { Title } from './cells/title';
import { Category } from './cells/category';
import { Conflict } from './cells/conflict';
import { Version } from './cells/version';
import { Creator } from './cells/creator';
import { Actions } from './cells/actions';
import { Order } from './cells/order';

type RowProps = {
	mod: ModItemSeparatorUnion;
	modIndex: number;
	id: string;
	isSelected?: boolean;
	onSelect?: (id: string, ctrlKey: boolean) => void;
};

const RowComponent = ({
	mod,
	modIndex,
	id,
	isSelected = false,
	onSelect,
}: RowProps) => {
	const sort_by = settingStore(state => state.sort_by);
	const isSortingEnabled = sort_by === 'load_order';

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: isSortingEnabled
			? CSS.Transform.toString(transform)
			: undefined,
		transition: isSortingEnabled ? transition : undefined,
		opacity: isSortingEnabled && isDragging ? 0.5 : 1,
	};

	const cellStyle = {
		backgroundColor: mod.background_color,
		color: mod.text_color,
	};

	const handleRowClick = (e: React.MouseEvent) => {
		if (sort_by === 'load_order' && onSelect && !isSeparator(mod)) {
			onSelect(id, e.ctrlKey);
		}
	};

	return (
		<TableRow
			ref={setNodeRef}
			style={{
				...style,
				...(isSelected
					? { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
					: {}),
			}}
			key={mod.identifier}
			onClick={handleRowClick}
			className={`${
				isSelected ? 'ring-1 ring-blue-800' : ''
			} cursor-pointer`}
		>
			<TableCell
				className={`select-none ${
					isSortingEnabled ? 'cursor-move' : 'cursor-default'
				}`}
				style={cellStyle}
				{...(isSortingEnabled ? attributes : {})}
				{...(isSortingEnabled ? listeners : {})}
			>
				<div className="flex items-center justify-center h-full">
					<GripVerticalIcon
						className={`h-4 w-4 text-muted-foreground ${
							isSortingEnabled ? '' : 'opacity-50'
						}`}
					/>
				</div>
			</TableCell>
			<Order mod={mod} modIndex={modIndex} />
			<Selection mod={mod} />
			<Title mod={mod} />
			<Category mod={mod} />
			<Conflict mod={mod} />
			<Version mod={mod} />
			<Creator mod={mod} />
			<Actions mod={mod as ModItem} />
		</TableRow>
	);
};

export const Row = memo(RowComponent, (prevProps, nextProps) => {
	return (
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.modIndex === nextProps.modIndex &&
		prevProps.isSelected === nextProps.isSelected
	);
});
