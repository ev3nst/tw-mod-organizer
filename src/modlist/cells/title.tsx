import { memo, useState, useEffect, useRef } from 'react';
import { TableCell } from '@/components/table';
import { settingStore } from '@/lib/store/setting';
import { modsStore } from '@/lib/store/mods';
import { modMetaStore } from '@/lib/store/mod_meta';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { TriangleAlertIcon } from 'lucide-react';

export const Title = memo(
	({
		mod,
		hasViolation,
		dependentCount,
		dependentModIds,
	}: {
		mod: ModItemSeparatorUnion;
		hasViolation?: boolean;
		dependentCount?: number;
		dependentModIds?: string[];
	}) => {
		const { title, background_color, text_color } = mod;

		const toggle_category = settingStore(state => state.toggle_category);
		const toggle_conflict = settingStore(state => state.toggle_conflict);
		const toggle_version = settingStore(state => state.toggle_version);
		const toggle_creator = settingStore(state => state.toggle_creator);
		const toggle_created_at = settingStore(
			state => state.toggle_created_at,
		);

		const metaData = modMetaStore(state => state.data);
		const mods = modsStore(state => state.mods);

		const selectedModMeta = metaData.find(
			md => md.mod_id === mod.identifier,
		);
		const [showTooltip, setShowTooltip] = useState(false);
		const tooltipRef = useRef<HTMLDivElement | null>(null);

		// Close tooltip when clicking outside
		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (
					tooltipRef.current &&
					!tooltipRef.current.contains(event.target as Node)
				) {
					setShowTooltip(false);
				}
			};

			if (showTooltip) {
				document.addEventListener('mousedown', handleClickOutside);
			} else {
				document.removeEventListener('mousedown', handleClickOutside);
			}

			return () =>
				document.removeEventListener('mousedown', handleClickOutside);
		}, [showTooltip]);

		if (isSeparator(mod)) {
			const cellStyle = {
				backgroundColor: background_color,
				color: text_color,
			};

			let separatorColSpan = 6;
			if (!toggle_category) separatorColSpan--;
			if (!toggle_conflict) separatorColSpan--;
			if (!toggle_version) separatorColSpan--;
			if (!toggle_creator) separatorColSpan--;
			if (!toggle_created_at) separatorColSpan--;

			return (
				<TableCell
					className="p-0 m-0 ps-5 select-none flex-grow"
					colSpan={separatorColSpan}
					style={cellStyle}
				>
					{title}
				</TableCell>
			);
		} else {
			const preview_local =
				'preview_local' in mod ? mod.preview_local : undefined;
			const preview_url =
				'preview_url' in mod ? mod.preview_url : undefined;
			const imgSrc = preview_local !== '' ? preview_local : preview_url;

			let titleTxt = title;
			if (selectedModMeta?.title) {
				titleTxt = selectedModMeta.title;
			}

			return (
				<TableCell className="select-none flex-grow">
					<div className="flex items-center gap-2">
						{imgSrc && (
							<img
								className="rounded-full object-cover h-6 w-6 select-none"
								src={imgSrc}
							/>
						)}
						{titleTxt ?? ''}
						{hasViolation &&
							dependentCount &&
							dependentCount > 0 && (
								<span
									className="text-xs px-1 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1 cursor-pointer"
									title="This mod should be loaded before mods that depend on it"
									onClick={() => setShowTooltip(!showTooltip)}
								>
									<TriangleAlertIcon className="w-3.5 h-3.5" />{' '}
									{dependentCount}
								</span>
							)}
						{dependentModIds &&
							dependentModIds.length > 0 &&
							showTooltip && (
								<div className="relative" ref={tooltipRef}>
									<div className="absolute left-0 bottom-full mb-5 bg-white dark:bg-gray-900 p-3 rounded shadow-lg z-10 w-64">
										<h4 className="font-semibold mb-1 text-base">
											Dependency Violation
										</h4>
										<p className="text-sm mb-2 text-muted-foreground">
											These mods depend on this mod but
											are loaded before it:
										</p>
										<ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
											{dependentModIds.map(
												dependentId => {
													const dependentMod =
														mods.find(
															m =>
																m.identifier ===
																dependentId,
														);
													return (
														<li
															key={`dependent_${dependentId}`}
															className="break-all"
														>
															{dependentMod?.title ||
																dependentId}
														</li>
													);
												},
											)}
										</ul>
									</div>
								</div>
							)}
					</div>
				</TableCell>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.hasViolation === nextProps.hasViolation,
);
