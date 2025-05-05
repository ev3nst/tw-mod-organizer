import { useMemo } from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { GripVerticalIcon, InfoIcon } from 'lucide-react';

import { settingStore } from '@/lib/store/setting';
import { ModItemSeparatorUnion } from '@/lib/store/mod_separator';
import { modMetaStore } from '@/lib/store/mod_meta';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

type RowDragOverlayProps = {
	mod: ModItemSeparatorUnion;
	selectedCount: number;
};

export const RowDragOverlay = ({ mod, selectedCount }: RowDragOverlayProps) => {
	const preview_size = settingStore(state => state.preview_size);
	const metaData = modMetaStore(state => state.data);

	const imgSrc = useMemo(() => {
		const preview_local =
			'preview_local' in mod ? mod.preview_local : undefined;
		const preview_url = 'preview_url' in mod ? mod.preview_url : undefined;
		return preview_local !== '' ? preview_local : preview_url;
	}, [mod.identifier]);

	const selectedModMeta = useMemo(
		() => metaData.find(md => md.mod_id === mod.identifier),
		[metaData, mod.identifier],
	);

	const titleTxt = useMemo(
		() => selectedModMeta?.title || mod.title,
		[selectedModMeta?.title, mod.title],
	);

	return (
		<DragOverlay>
			<div className="ring-1 ring-blue-800 bg-blue-500/10 h-[35px] flex items-center">
				<div className="flex items-center justify-center h-full relative w-[40px]">
					<GripVerticalIcon
						className={`h-4 w-4 text-muted-foreground dark:text-primary/60 `}
					/>
				</div>

				<div
					className="select-none ps-[120px]"
					style={TABLE_DIMENSIONS.TITLE}
				>
					<div className="flex items-center gap-2">
						{imgSrc && (
							<img
								className={`object-cover h-${preview_size} ${
									preview_size < 10
										? `w-${preview_size} rounded-full`
										: ''
								} select-none`}
								src={imgSrc}
							/>
						)}
						<span className="whitespace-pre-wrap">
							{titleTxt ?? ''}
							{selectedModMeta?.title !== '' && (
								<InfoIcon className="inline-block align-middle relative top-[-1px] text-sky-300 w-3 h-3 ml-2" />
							)}
						</span>
						{selectedCount > 1 && (
							<div className="bg-blue-700 text-white text-xs px-2 py-1 rounded-full">
								+{selectedCount - 1} more
							</div>
						)}
					</div>
				</div>
			</div>
		</DragOverlay>
	);
};
