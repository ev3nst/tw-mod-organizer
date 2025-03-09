import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';

import { TableCell, TableRow } from '@/components/table';

import type { ModItem, ModItemSeparatorUnion } from '@/lib/api';

import { Selection } from './cells/selection';
import { Title } from './cells/title';
import { Category } from './cells/category';
import { Conflict } from './cells/conflict';
import { Version } from './cells/version';
import { Actions } from './cells/actions';
import { Order } from './cells/order';

type RowProps = {
	mod: ModItemSeparatorUnion;
	modIndex: number;
	id: string;
};

const RowComponent = ({ mod, modIndex, id }: RowProps) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const cellStyle = {
		backgroundColor: mod.background_color,
		color: mod.text_color,
	};

	return (
		<TableRow ref={setNodeRef} style={style} key={mod.identifier}>
			<TableCell style={cellStyle}>
				<div
					className="cursor-move flex items-center justify-center h-full"
					{...attributes}
					{...listeners}
				>
					<GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
				</div>
			</TableCell>
			<Order mod={mod} modIndex={modIndex} />
			<Selection mod={mod} />
			<Title mod={mod} />
			<Category mod={mod} />
			<Conflict mod={mod} />
			<Version mod={mod} />
			<Actions mod={mod as ModItem} />
		</TableRow>
	);
};

export const Row = memo(RowComponent, (prevProps, nextProps) => {
	return (
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.modIndex === nextProps.modIndex
	);
});
