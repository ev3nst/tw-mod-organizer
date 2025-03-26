import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';

import { TableCell, TableRow } from '@/components/table';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuTrigger,
} from '@/components/context-menu';

import { settingStore } from '@/lib/store/setting';
import type { ModItem } from '@/lib/store/mods';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { Selection } from './cells/selection';
import { Type } from './cells/type';
import { Title } from './cells/title';
import { Category } from './cells/category';
import { Conflict } from './cells/conflict';
import { Version } from './cells/version';
import { Creator } from './cells/creator';
import {
	Actions,
	ModActionContextMenuRenderer,
	ModActionDropdownRenderer,
} from './cells/actions';
import { Order } from './cells/order';
import { CreatedAt } from './cells/created_at';
import { UpdatedAt } from './cells/updated_at';

type RowProps = {
	mod: ModItemSeparatorUnion;
	modIndex: number;
	id: string;
	isSelected: boolean;
	onSelect: (id: string, ctrlKey: boolean) => void;
	selectRange: (startId: string, endId: string) => void;
	lastSelectedId: string | null;
	setLastSelectedId: (id: string | null) => void;
	hasViolation?: boolean;
	dependentMods?: Set<string>;
};

const RowComponent = ({
	mod,
	modIndex,
	id,
	isSelected = false,
	onSelect,
	selectRange,
	lastSelectedId,
	setLastSelectedId,
	hasViolation = false,
	dependentMods,
}: RowProps) => {
	const selectedGame = settingStore(state => state.selectedGame);
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
			if (e.shiftKey && lastSelectedId) {
				selectRange(lastSelectedId, id);
			} else {
				onSelect(id, e.ctrlKey);
				if (setLastSelectedId) {
					setLastSelectedId(id);
				}
			}
		}
	};

	const showViolation = isSortingEnabled && hasViolation;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
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
					className={`${isSelected ? 'ring-1 ring-blue-800' : ''} ${
						showViolation
							? 'ring-1 ring-red-500 bg-red-50 dark:bg-red-900/20'
							: ''
					} cursor-pointer`}
				>
					<TableCell
						className={`select-none w-[40px] ${
							isSortingEnabled ? 'cursor-move' : 'cursor-default'
						}`}
						style={cellStyle}
						{...(isSortingEnabled ? attributes : {})}
						{...(isSortingEnabled ? listeners : {})}
					>
						<div className="flex items-center justify-center h-full relative">
							<GripVerticalIcon
								className={`h-4 w-4 text-muted-foreground ${
									isSortingEnabled ? '' : 'opacity-50'
								}`}
							/>
							{showViolation && (
								<div className="absolute left-0 h-full w-1 bg-red-500"></div>
							)}
						</div>
					</TableCell>
					<Order mod={mod} modIndex={modIndex} />
					<Selection mod={mod} />
					<Type mod={mod} />
					<Title
						mod={mod}
						hasViolation={showViolation}
						dependentCount={dependentMods?.size}
						dependentModIds={
							dependentMods && dependentMods.size > 0
								? Array.from(dependentMods)
								: undefined
						}
					/>
					<Category mod={mod} />
					{selectedGame!.slug !== 'mbbl' && <Conflict mod={mod} />}
					<Version mod={mod} />
					<Creator mod={mod} />
					<CreatedAt mod={mod} />
					<UpdatedAt mod={mod} />
					<Actions
						mod={mod as ModItem}
						ModActionRenderer={ModActionDropdownRenderer}
					/>
				</TableRow>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<Actions
					mod={mod as ModItem}
					ModActionRenderer={ModActionContextMenuRenderer}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
};

export const Row = memo(RowComponent, (prevProps, nextProps) => {
	return (
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.modIndex === nextProps.modIndex &&
		prevProps.isSelected === nextProps.isSelected &&
		prevProps.lastSelectedId === nextProps.lastSelectedId &&
		prevProps.hasViolation === nextProps.hasViolation &&
		areSetsSame(prevProps.dependentMods, nextProps.dependentMods)
	);
});

function areSetsSame(a?: Set<string>, b?: Set<string>): boolean {
	if (!a && !b) return true;
	if (!a || !b) return false;
	if (a.size !== b.size) return false;

	for (const item of a) {
		if (!b.has(item)) return false;
	}

	return true;
}
