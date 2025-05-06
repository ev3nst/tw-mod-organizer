import { useRef, memo, useEffect, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SettingModel } from '@/lib/store/setting';
import type { ModItemSeparatorUnion } from '@/lib/store/mod_separator';

import { Header } from './header';
import { Row } from './row';
import { GoTop, GoTopHandle } from './go-top';

type ModTableProps = {
	modsResolved: ModItemSeparatorUnion[];
	modIndices: Map<string, number>;
	selectedRows: Set<string>;
	toggleRow: (modId: string, ctrlKey: boolean) => void;
	selectRange: (startId: string, endId: string) => void;
	lastSelectedId: string | null;
	setLastSelectedId: (id: string | null) => void;
	dependencyViolations: Map<string, Set<string>>;
};

export const ModTable: React.FC<ModTableProps> = memo(
	({
		modsResolved,
		modIndices,
		selectedRows,
		toggleRow,
		selectRange,
		lastSelectedId,
		setLastSelectedId,
		dependencyViolations,
	}) => {
		const goTopRef = useRef<GoTopHandle>(null);
		const hasRestoredScroll = useRef(false);
		const saveTimeout = useRef<NodeJS.Timeout | null>(null);
		const virtuosoRef = useRef<VirtuosoHandle>(null);
		useEffect(() => {
			(async () => {
				if (hasRestoredScroll.current) return;
				hasRestoredScroll.current = true;
				try {
					const setting = await SettingModel.retrieve();
					const scrollTop = setting.mod_table_scroll || 0;
					virtuosoRef.current?.scrollTo({ top: scrollTop });
				} catch (error) {
					console.error('Failed to load scroll position:', error);
				}
			})();
		}, []);

		const handleScroll = useCallback((e: React.UIEvent) => {
			const scrollTop = (e.target as HTMLElement).scrollTop;
			goTopRef.current?.onScroll(scrollTop);
			if (saveTimeout.current) clearTimeout(saveTimeout.current);
			saveTimeout.current = setTimeout(async () => {
				try {
					const setting = await SettingModel.retrieve();
					setting.mod_table_scroll = scrollTop;
					await setting.save();
				} catch (error) {
					console.error('Failed to save scroll position:', error);
				}
			}, 150);
		}, []);

		const sortableItems = useMemo(
			() => modsResolved.map(mod => mod.identifier),
			[modsResolved],
		);

		return (
			<div className="flex size-full flex-col">
				<Header />
				<div className="flex h-full flex-col text-sm">
					<GoTop ref={goTopRef} virtuosoRef={virtuosoRef} />
					<SortableContext
						items={sortableItems}
						strategy={verticalListSortingStrategy}
					>
						<Virtuoso
							ref={virtuosoRef}
							className="overflow-x-hidden overflow-y-scroll"
							style={{ height: 'calc(100% - 80px)' }}
							totalCount={modsResolved.length}
							onScroll={handleScroll}
							itemContent={index => {
								const mod = modsResolved[index];
								return (
									<Row
										key={mod.identifier}
										mod={mod}
										modIndex={
											modIndices.get(mod.identifier) ?? -1
										}
										id={mod.identifier}
										isSelected={selectedRows.has(
											mod.identifier,
										)}
										onSelect={toggleRow}
										selectRange={selectRange}
										lastSelectedId={lastSelectedId}
										setLastSelectedId={setLastSelectedId}
										hasViolation={dependencyViolations.has(
											mod.identifier,
										)}
										dependentMods={dependencyViolations.get(
											mod.identifier,
										)}
									/>
								);
							}}
						/>
					</SortableContext>
				</div>
			</div>
		);
	},
);
