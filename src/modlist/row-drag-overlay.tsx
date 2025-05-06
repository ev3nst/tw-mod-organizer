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
			<div className="flex h-[35px] items-center bg-blue-500/10 ring-1 ring-blue-800">
				<div className="relative flex h-full w-[40px] items-center justify-center">
					<GripVerticalIcon
						className={`size-4 text-muted-foreground dark:text-primary/60 `}
					/>
				</div>

				<div
					className="select-none ps-[120px]"
					style={TABLE_DIMENSIONS.TITLE}
				>
					<div className="flex items-center gap-2">
						{imgSrc && (
							<img
								className={`h- object-cover${preview_size} ${
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
								<InfoIcon className="relative top-[-1px] ml-2 inline-block size-3 align-middle text-sky-300" />
							)}
						</span>
						{selectedCount > 1 && (
							<div className="rounded-full bg-blue-700 px-2 py-1 text-xs text-white">
								+{selectedCount - 1} more
							</div>
						)}
					</div>
				</div>
			</div>
		</DragOverlay>
	);
};
