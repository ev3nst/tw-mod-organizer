import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
	ArrowDownIcon,
	ArrowUpIcon,
	Grid2X2Icon,
	RotateCcwIcon,
} from 'lucide-react';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogAction,
} from '@/components/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';
import { modMetaStore } from '@/lib/store/mod_meta';
import { ModItem, modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { isSeparator } from '@/lib/store/mod_separator';
import { comparePriority } from '@/lib/store/pack-manager';

import { ToggleAll } from '@/modlist/toggle-all';
import { TABLE_DIMENSIONS } from '@/modlist/utils';

import { THVersion } from './version';

const SortByIndicator = ({
	title,
	description,
	textColorClass,
}: {
	title: string;
	description: string;
	textColorClass?: string;
}) => {
	return (
		<Tooltip>
			<TooltipTrigger
				className={`size-full hover:brightness-125 ${textColorClass}`}
			>
				{title}
			</TooltipTrigger>
			<TooltipContent>
				<p>{description}</p>
			</TooltipContent>
		</Tooltip>
	);
};

export const Header = memo(() => {
	const {
		selectedGame,
		toggle_type,
		toggle_category,
		toggle_conflict,
		toggle_creator,
		toggle_created_at,
		toggle_updated_at,
		sort_by,
		sort_by_direction,
		toggleTableManager,
	} = settingStore(
		useShallow(state => ({
			selectedGame: state.selectedGame,
			toggle_type: state.toggle_type,
			toggle_category: state.toggle_category,
			toggle_conflict: state.toggle_conflict,
			toggle_creator: state.toggle_creator,
			toggle_created_at: state.toggle_created_at,
			toggle_updated_at: state.toggle_updated_at,
			sort_by: state.sort_by,
			sort_by_direction: state.sort_by_direction,
			toggleTableManager: state.toggleTableManager,
		})),
	);

	const { mods, setMods } = modsStore(
		useShallow(state => ({
			mods: state.mods,
			setMods: state.setMods,
		})),
	);

	const setModOrderData = modOrderStore(state => state.setData);
	const toggleBulkCategory = modMetaStore(state => state.toggleBulkCategory);
	const orderByText = useMemo(() => {
		switch (sort_by) {
			case 'title':
				return (
					<SortByIndicator
						title="T"
						description="Sorting by mod title."
						textColorClass="text-blue-500"
					/>
				);
			case 'version':
				return (
					<SortByIndicator
						title="V"
						description="Sorting by mod version."
						textColorClass="text-purple-500"
					/>
				);
			case 'updated_at':
				return (
					<SortByIndicator
						title="U"
						description="Sorting by mod update time."
						textColorClass="text-green-500"
					/>
				);
			default:
				return (
					<SortByIndicator
						title="#"
						description="Sorting by load order."
					/>
				);
		}
	}, [sort_by]);

	const handleOnResetLoadOrder = (event: React.MouseEvent) => {
		event.stopPropagation();
		const onlyMods = mods.filter(mod => !isSeparator(mod)) as ModItem[];
		const separators = mods.filter(mod => isSeparator(mod));

		let sortedMods = [...onlyMods];
		if (selectedGame?.type === 'totalwar') {
			sortedMods.sort((a, b) => comparePriority(a.mod_file, b.mod_file));
		} else {
			sortedMods.sort((a, b) => a.created_at - b.created_at);
		}

		// Track circular dependencies we've found
		const circularPairs = new Set<string>();

		// First pass: detect circular dependencies
		for (let i = 0; i < sortedMods.length; i++) {
			const mod = sortedMods[i];
			if (mod.required_items && mod.required_items.length > 0) {
				for (const depId of mod.required_items) {
					// Find the dependency
					const depMod = sortedMods.find(m => m.identifier === depId);
					if (
						depMod &&
						depMod.required_items &&
						depMod.required_items.includes(mod.identifier)
					) {
						// This is a circular dependency - mark it
						circularPairs.add(`${mod.identifier},${depId}`);
						circularPairs.add(`${depId},${mod.identifier}`);
					}
				}
			}
		}

		// Second pass: resolve dependencies while preserving order
		const modIndex = new Map(
			sortedMods.map((mod, idx) => [mod.identifier, idx]),
		);
		let changed = true;
		let safety = 0;
		const maxIterations = 5;

		while (changed && safety < maxIterations) {
			changed = false;
			for (let i = 0; i < sortedMods.length; i++) {
				const mod = sortedMods[i];
				if (mod.required_items && mod.required_items.length > 0) {
					for (const depId of mod.required_items) {
						// Skip circular dependencies - we'll handle them separately
						if (circularPairs.has(`${mod.identifier},${depId}`)) {
							continue;
						}

						const depIdx = modIndex.get(depId);
						if (depIdx !== undefined && depIdx > i) {
							// Move the dependency before this mod
							const [depMod] = sortedMods.splice(depIdx, 1);
							sortedMods.splice(i, 0, depMod);

							// Only update indices for affected range
							for (let j = i; j <= depIdx; j++) {
								if (j < sortedMods.length) {
									modIndex.set(sortedMods[j].identifier, j);
								}
							}

							changed = true;
							break;
						}
					}
				}
			}
			safety++;
		}

		// Final pass: place circular dependencies next to each other
		if (circularPairs.size > 0) {
			let circularChanged = true;
			while (circularChanged && safety < maxIterations + 5) {
				circularChanged = false;

				for (let i = 0; i < sortedMods.length - 1; i++) {
					const currentId = sortedMods[i].identifier;

					// Check if any mod further down the list has a circular dependency with this one
					for (let j = i + 2; j < sortedMods.length; j++) {
						const otherId = sortedMods[j].identifier;

						if (circularPairs.has(`${currentId},${otherId}`)) {
							// Move the distant circular dependency next to the current one
							const [movedMod] = sortedMods.splice(j, 1);
							sortedMods.splice(i + 1, 0, movedMod);

							// Update indices
							for (let k = i + 1; k <= j; k++) {
								if (k < sortedMods.length) {
									modIndex.set(sortedMods[k].identifier, k);
								}
							}

							circularChanged = true;
							break;
						}
					}

					if (circularChanged) break;
				}

				safety++;
			}

			toast.info(
				'Some mods have circular dependencies and have been placed next to each other.',
			);
		}

		if (safety >= maxIterations) {
			toast.warning(
				'Possible complex circular dependency detected in mod load order.',
			);
		}

		const newArray = [...sortedMods, ...separators];

		setMods(newArray);
		setModOrderData(
			newArray.map((na, ni) => ({
				mod_id: na.identifier,
				order: ni + 1,
				title: na.title,
				mod_file_path:
					'mod_file_path' in na ? na.mod_file_path : undefined,
			})),
		);
	};

	return (
		<div className="sticky top-0 z-10 flex h-[40px] w-full flex-row items-center overflow-y-scroll border-b bg-background text-sm font-semibold text-muted-foreground shadow-[0_1px_2px_0_hsl(var(--secondary-border)/0.6)]">
			<div
				className="flex items-center justify-center"
				style={TABLE_DIMENSIONS.SORTING}
			>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-6 text-primary"
						>
							<RotateCcwIcon className="size-4" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Reset Load Order
							</AlertDialogTitle>
							<AlertDialogDescription>
								This action is irreversible. You are about to
								reset your current profile's load order.
								Automatic sorting will make sure that
								<span className="mx-1 text-blue-500">
									dependency
								</span>
								checks are resolved and sorted by their
								<span className="mx-1 text-blue-500">
									{selectedGame?.type === 'totalwar'
										? '.pack file names.'
										: 'creation date.'}
								</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-500 text-white hover:bg-red-700"
								onClick={handleOnResetLoadOrder}
							>
								Reset
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			<div className="text-center" style={TABLE_DIMENSIONS.ORDER}>
				{orderByText}
			</div>
			<div
				className="items-center justify-center"
				style={TABLE_DIMENSIONS.SELECTION}
			>
				<ToggleAll />
			</div>
			{toggle_type && (
				<div className="text-center" style={TABLE_DIMENSIONS.TYPE}>
					TYPE
				</div>
			)}
			<div style={TABLE_DIMENSIONS.TITLE}>TITLE</div>
			{toggle_category && (
				<div
					className="hover:cursor-pointer hover:brightness-125"
					style={TABLE_DIMENSIONS.CATEGORY}
					onClick={toggleBulkCategory}
				>
					CATEGORY
				</div>
			)}
			{selectedGame!.slug !== 'mbbl' && toggle_conflict && (
				<div
					className="items-center justify-center"
					style={TABLE_DIMENSIONS.CONFLICT}
				>
					<Tooltip>
						<TooltipTrigger className="hover:brightness-125">
							CFT
						</TooltipTrigger>
						<TooltipContent>
							<p>Conflicts</p>
						</TooltipContent>
					</Tooltip>
				</div>
			)}
			<div style={TABLE_DIMENSIONS.VERSION}>
				<THVersion />
			</div>
			{toggle_creator && (
				<div style={TABLE_DIMENSIONS.CREATOR}>CREATOR</div>
			)}
			{toggle_created_at && (
				<div style={TABLE_DIMENSIONS.CREATED_AT}>CREATED</div>
			)}
			{toggle_updated_at && (
				<div style={TABLE_DIMENSIONS.UPDATED_AT}>
					<div className="flex items-center gap-1">
						UPDATED
						{sort_by === 'updated_at' &&
							(sort_by_direction === 'asc' ? (
								<ArrowDownIcon className="size-4" />
							) : (
								<ArrowUpIcon className="size-4" />
							))}
					</div>
				</div>
			)}
			<div
				className="flex items-center justify-center"
				style={TABLE_DIMENSIONS.ACTIONS}
			>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={() => toggleTableManager(true)}
				>
					<Grid2X2Icon />
				</Button>
			</div>
		</div>
	);
});
