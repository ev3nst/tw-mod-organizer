import {
	memo,
	useState,
	useEffect,
	useRef,
	useCallback,
	type ReactNode,
} from 'react';
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';

import { TableCell } from '@/components/table';

import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { modMetaStore } from '@/lib/store/mod_meta';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { modActivationStore } from '@/lib/store/mod_activation';

type TooltipProps = {
	isVisible: boolean;
	onClose: () => void;
	triggerRef: React.RefObject<HTMLElement>;
	children: ReactNode;
};

const Tooltip = ({
	isVisible,
	onClose,
	triggerRef,
	children,
}: TooltipProps) => {
	const tooltipRef = useRef<HTMLDivElement | null>(null);

	const handleClickOutside = useCallback(
		(event: MouseEvent) => {
			if (
				tooltipRef.current &&
				!tooltipRef.current.contains(event.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		},
		[onClose, triggerRef],
	);

	useEffect(() => {
		if (isVisible) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isVisible, handleClickOutside]);

	if (!isVisible) return null;

	return (
		<div className="relative" ref={tooltipRef}>
			<div className="absolute left-0 bottom-full mb-5 bg-white dark:bg-gray-900 p-3 rounded shadow-lg z-10 w-64">
				{children}
			</div>
		</div>
	);
};

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
		const modActivationData = modActivationStore(state => state.data);
		const mods = modsStore(state => state.mods);

		const selectedModMeta = metaData.find(
			md => md.mod_id === mod.identifier,
		);
		const [showDependencyTooltip, setShowDependencyTooltip] =
			useState(false);
		const [showParentTooltip, setShowParentTooltip] = useState(false);

		// Memoized toggle handlers
		const toggleDependencyTooltip = useCallback(() => {
			setShowDependencyTooltip(prev => !prev);
		}, []);

		const toggleParentTooltip = useCallback(() => {
			setShowParentTooltip(prev => !prev);
		}, []);

		const dependencyTriggerRef = useRef<HTMLSpanElement | null>(null);
		const parentTriggerRef = useRef<HTMLSpanElement | null>(null);

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

			const currentMod = mod as ModItem;
			const passiveRequiredParents: ModItem[] = [];
			if (
				currentMod.item_type !== 'base_mod' &&
				currentMod.required_items.length > 0
			) {
				const isActive = modActivationData.find(
					ma => ma.mod_id === mod.identifier,
				)?.is_active;
				if (isActive) {
					for (
						let ri = 0;
						ri < currentMod.required_items.length;
						ri++
					) {
						const isParentPassive = modActivationData.some(
							map =>
								map.mod_id === currentMod.required_items[ri] &&
								map.is_active === false,
						);
						if (isParentPassive) {
							const parentMod = mods.find(
								m =>
									m.identifier ===
									currentMod.required_items[ri],
							) as ModItem | undefined;
							if (parentMod) {
								passiveRequiredParents.push(parentMod);
							}
						}
					}
				}
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
									ref={dependencyTriggerRef}
									className="text-xs px-1 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1 cursor-pointer"
									title="This mod should be loaded before mods that depend on it"
									onClick={toggleDependencyTooltip}
								>
									<TriangleAlertIcon className="w-3.5 h-3.5" />{' '}
									{dependentCount}
								</span>
							)}
						{dependentModIds && dependentModIds.length > 0 && (
							<Tooltip
								isVisible={showDependencyTooltip}
								onClose={() => setShowDependencyTooltip(false)}
								triggerRef={dependencyTriggerRef}
							>
								<>
									<h4 className="font-semibold mb-1 text-base">
										Dependency Violation
									</h4>
									<p className="text-sm mb-2 text-muted-foreground">
										These mods depend on this mod but are
										loaded before it:
									</p>
									<ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
										{dependentModIds.map(dependentId => {
											const dependentMod = mods.find(
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
										})}
									</ul>
								</>
							</Tooltip>
						)}
						{passiveRequiredParents &&
							passiveRequiredParents.length > 0 && (
								<span
									ref={parentTriggerRef}
									className="text-xs px-1 py-0.5 rounded bg-red-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 flex items-center gap-1 cursor-pointer"
									title="This mod requires active parent mod(s)"
									onClick={toggleParentTooltip}
								>
									<CircleAlertIcon className="w-3.5 h-3.5" />{' '}
									{passiveRequiredParents.length}
								</span>
							)}
						{passiveRequiredParents &&
							passiveRequiredParents.length > 0 && (
								<Tooltip
									isVisible={showParentTooltip}
									onClose={() => setShowParentTooltip(false)}
									triggerRef={parentTriggerRef}
								>
									<>
										<h4 className="font-semibold mb-1 text-base">
											Dependency Violation
										</h4>
										<p className="text-sm mb-2 text-muted-foreground">
											These mods are required for this mod
											to work but they are not active.
										</p>
										<ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
											{passiveRequiredParents.map(
												parentMod => (
													<li
														key={`parent_${parentMod.identifier}`}
														className="break-all"
													>
														{parentMod.title}
													</li>
												),
											)}
										</ul>
									</>
								</Tooltip>
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
