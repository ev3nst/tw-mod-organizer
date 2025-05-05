import { memo, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuTrigger,
} from '@/components/context-menu';

import { settingStore } from '@/lib/store/setting';
import { type ModItem } from '@/lib/store/mods';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';

import { Sort } from './cells/sort';
import { Selection } from './cells/selection';
import { Type } from './cells/type';
import { Title } from './cells/title';
import { Category } from './cells/category';
import { Conflict } from './cells/conflict';
import { Version } from './cells/version';
import { Creator } from './cells/creator';
import { Order } from './cells/order';
import { CreatedAt } from './cells/created_at';
import { UpdatedAt } from './cells/updated_at';
import {
	Actions,
	ModActionContextMenuRenderer,
	ModActionDropdownRenderer,
} from './cells/actions';

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

const PreviewImgSizeToRowHeight = {
	6: 35,
	8: 40,
	10: 45,
	12: 50,
	16: 60,
	20: 80,
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
	const { selectedGame, sort_by, preview_size } = settingStore(
		useShallow(state => ({
			selectedGame: state.selectedGame,
			sort_by: state.sort_by,
			preview_size: state.preview_size,
		})),
	);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const isSortingEnabled = sort_by === 'load_order';
	const showViolation = isSortingEnabled && hasViolation;

	const style = {
		transform: isSortingEnabled
			? CSS.Transform.toString(transform)
			: undefined,
		transition: isSortingEnabled ? transition : undefined,
		opacity: isSortingEnabled && isDragging ? 0 : 1,
	};

	const cellStyle = useMemo(
		() => ({
			backgroundColor: mod.background_color,
			color: mod.text_color,
		}),
		[mod.identifier],
	);

	const handleRowClick = useCallback(
		(e: React.MouseEvent) => {
			if (sort_by === 'load_order' && !isSeparator(mod)) {
				if (e.shiftKey && lastSelectedId) {
					selectRange(lastSelectedId, id);
				} else {
					onSelect(id, e.ctrlKey);
					setLastSelectedId(id);
				}
			}
		},
		[sort_by, mod.identifier, lastSelectedId, id],
	);

	const onContextOpen = useMemo(
		() => (isOpen: boolean) => {
			if (isOpen) {
				onSelect(id, false);
			}
		},
		[onSelect, id],
	);

	const rowClassName = useMemo(
		() =>
			`flex mod-row hover:bg-muted/50 py-1.5 min-h-[${PreviewImgSizeToRowHeight[preview_size as keyof typeof PreviewImgSizeToRowHeight]}px] border-b border-border/70 ${
				isSelected ? '!ring-1 !ring-blue-800 !bg-blue-500/10' : ''
			} ${
				showViolation
					? 'ring-1 ring-red-500 bg-red-50 dark:bg-red-900/20'
					: ''
			} cursor-pointer`,
		[isSelected, showViolation, preview_size],
	);

	const dependentModsArray = useMemo(
		() =>
			dependentMods && dependentMods.size > 0
				? Array.from(dependentMods)
				: undefined,
		[dependentMods],
	);

	const sortableProps = useMemo(
		() => ({
			attributes,
			listeners,
			style: {
				transform: isSortingEnabled
					? CSS.Transform.toString(transform)
					: undefined,
				transition: isSortingEnabled ? transition : undefined,
				opacity: isSortingEnabled && isDragging ? 0.5 : 1,
			},
		}),
		[
			isSortingEnabled,
			transform,
			transition,
			isDragging,
			attributes,
			listeners,
		],
	);

	return (
		<ContextMenu onOpenChange={onContextOpen}>
			<ContextMenuTrigger asChild>
				<div
					ref={setNodeRef}
					style={{
						...style,
						...(isSeparator(mod) ? cellStyle : {}),
					}}
					key={mod.identifier}
					onClick={handleRowClick}
					className={rowClassName}
				>
					<Sort
						mod={mod}
						id={id}
						isSelected={isSelected}
						onSelect={onSelect}
						setLastSelectedId={setLastSelectedId}
						{...sortableProps}
					/>

					<Order mod={mod} modIndex={modIndex} />
					<Selection mod={mod} />
					<Type mod={mod} />
					<Title
						mod={mod}
						hasViolation={showViolation}
						dependentCount={dependentMods?.size}
						dependentModIds={dependentModsArray}
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
				</div>
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
	if (prevProps.mod !== nextProps.mod) return false;
	if (prevProps.modIndex !== nextProps.modIndex) return false;
	if (prevProps.isSelected !== nextProps.isSelected) return false;
	if (prevProps.lastSelectedId !== nextProps.lastSelectedId) return false;
	if (prevProps.hasViolation !== nextProps.hasViolation) return false;
	if (!areSetsSame(prevProps.dependentMods, nextProps.dependentMods))
		return false;
	return true;
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
