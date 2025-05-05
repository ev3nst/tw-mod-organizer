import { memo, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/popover';

import api from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { ModItem, modsStore } from '@/lib/store/mods';
import { modMetaStore } from '@/lib/store/mod_meta';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import { modActivationStore } from '@/lib/store/mod_activation';

import { TABLE_DIMENSIONS } from '@/modlist/utils';

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
		const { preview_size, toggle_type } = settingStore(
			useShallow(state => ({
				preview_size: state.preview_size,
				toggle_type: state.toggle_type,
			})),
		);

		const metaData = modMetaStore(state => state.data);
		const modActivationData = modActivationStore(state => state.data);
		const mods = modsStore(state => state.mods);

		const selectedModMeta = useMemo(
			() => metaData.find(md => md.mod_id === mod.identifier),
			[metaData, mod.identifier],
		);

		const [showDependencyPopover, setShowDependencyPopover] =
			useState(false);
		const [showParentPopover, setShowParentPopover] = useState(false);

		const imgSrc = useMemo(() => {
			const preview_local =
				'preview_local' in mod ? mod.preview_local : undefined;
			const preview_url =
				'preview_url' in mod ? mod.preview_url : undefined;
			return preview_local !== '' ? preview_local : preview_url;
		}, [mod.identifier]);

		const titleTxt = useMemo(
			() => selectedModMeta?.title || mod.title,
			[selectedModMeta?.title, mod.title],
		);

		const passiveRequiredParents = useMemo(() => {
			if (
				isSeparator(mod) ||
				(mod as ModItem).item_type === 'base_mod' ||
				(mod as ModItem).required_items.length === 0
			) {
				return [];
			}

			const currentMod = mod as ModItem;
			const result: ModItem[] = [];

			const isActive = modActivationData.find(
				ma => ma.mod_id === mod.identifier,
			)?.is_active;

			if (!isActive) {
				return result;
			}

			currentMod.required_items.forEach(requiredId => {
				let findById = requiredId;
				let parentActivation = modActivationData.find(
					ma => ma.mod_id === requiredId,
				);

				if (!parentActivation) {
					const findModByGameId = mods.find(
						m => (m as ModItem)?.game_specific_id === requiredId,
					);
					if (findModByGameId) {
						findById = findModByGameId.identifier;
						parentActivation = modActivationData.find(
							ma => ma.mod_id === findModByGameId.identifier,
						);
					}
				}

				if (parentActivation) {
					const isParentPassive = parentActivation.is_active !== true;
					if (isParentPassive) {
						const parentMod = mods.find(
							m => m.identifier === findById,
						) as ModItem | undefined;

						if (
							parentMod &&
							parentMod.item_type !== 'base_mod' &&
							parentMod.identifier !== 'BirthAndDeath'
						) {
							result.push(parentMod);
						}
					}
				} else {
					result.push({
						identifier: findById,
						title: findById,
					} as ModItem);
				}
			});

			return result;
		}, [mod, modActivationData, mods]);

		if (isSeparator(mod)) {
			return (
				<div
					className={`p-0 m-0 ${
						toggle_type ? 'ps-3' : 'ps-0'
					} select-none items-center`}
					style={TABLE_DIMENSIONS.TITLE}
				>
					{mod.title}
				</div>
			);
		} else {
			return (
				<div
					className="select-none pe-3"
					style={TABLE_DIMENSIONS.TITLE}
				>
					<div className="flex flex-row flex-nowrap items-center gap-2 w-full">
						{imgSrc && (
							<img
								className={`object-cover align-middle flex-shrink-0 h-${preview_size} ${
									preview_size < 10
										? `w-${preview_size} rounded-full`
										: ''
								} select-none`}
								src={imgSrc}
							/>
						)}
						<div className="whitespace-pre-wrap break-words min-w-0 flex-1 items-center">
							<span className="align-middle">
								{titleTxt ?? ''}
							</span>
							{selectedModMeta?.title !== '' && (
								<InfoIcon className="inline-block align-middle relative top-[-1px] text-sky-300 w-3 h-3 ml-2" />
							)}
							{hasViolation &&
								dependentCount &&
								dependentCount > 0 && (
									<Popover
										open={showDependencyPopover}
										onOpenChange={setShowDependencyPopover}
									>
										<PopoverTrigger asChild>
											<span
												className="ml-2 text-xs px-1 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 inline-flex items-center gap-1 cursor-pointer align-middle"
												title="This mod should be loaded before mods that depend on it"
											>
												<TriangleAlertIcon className="w-3.5 h-3.5" />
												{dependentCount}
											</span>
										</PopoverTrigger>
										<PopoverContent
											side="top"
											align="start"
											className="w-64"
										>
											<h4 className="font-semibold mb-1 text-base text-red-600">
												Dependency Order
											</h4>
											<p className="text-sm mb-2 text-muted-foreground">
												These mods depend on this mod
												but are loaded before it:
											</p>
											<ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
												{dependentModIds?.map(
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
										</PopoverContent>
									</Popover>
								)}
							{passiveRequiredParents &&
								passiveRequiredParents.length > 0 && (
									<Popover
										open={showParentPopover}
										onOpenChange={setShowParentPopover}
									>
										<PopoverTrigger asChild>
											<span
												className="ml-2 text-xs px-1 py-0.5 rounded bg-red-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 inline-flex items-center gap-1 cursor-pointer align-middle"
												title="This mod requires active parent mod(s)"
											>
												<CircleAlertIcon className="w-3.5 h-3.5" />
												{passiveRequiredParents.length}
											</span>
										</PopoverTrigger>
										<PopoverContent
											side="top"
											align="start"
											className="w-64"
										>
											<h4 className="font-semibold mb-1 text-base text-orange-600">
												Dependency Not Active
											</h4>
											<p className="text-sm mb-2 text-muted-foreground">
												These mods are required for this
												mod to work but they are not
												active.
											</p>
											<ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
												{passiveRequiredParents.map(
													parentMod => {
														const isMissingSteamMod =
															Number.isNaN(
																Number(
																	parentMod.title as any,
																),
															) === false;
														return (
															<li
																key={`parent_${parentMod.identifier}`}
																className={`break-all ${
																	isMissingSteamMod
																		? 'hover:cursor-pointer hover:text-blue-500'
																		: ''
																}`}
																onClick={() =>
																	isMissingSteamMod &&
																	api.open_external_url(
																		`https://steamcommunity.com/sharedfiles/filedetails/?id=${parentMod.title}`,
																	)
																}
															>
																{isMissingSteamMod
																	? `https://steamcommunity.com/sharedfiles/filedetails/?id=${parentMod.title}`
																	: parentMod.title}
															</li>
														);
													},
												)}
											</ul>
										</PopoverContent>
									</Popover>
								)}
						</div>
					</div>
				</div>
			);
		}
	},
	(prevProps, nextProps) =>
		prevProps.mod.identifier === nextProps.mod.identifier &&
		prevProps.hasViolation === nextProps.hasViolation &&
		prevProps.dependentCount === nextProps.dependentCount,
);
