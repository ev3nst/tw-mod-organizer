import {
	ArrowDownIcon,
	ArrowUpIcon,
	Grid2X2Icon,
	RotateCcwIcon,
} from 'lucide-react';

import { TableHead, TableHeader, TableRow } from '@/components/table';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
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
import { ProfileSwitcher } from '@/modlist/profile';
import { modMetaStore } from '@/lib/store/mod_meta';

import { ToggleAll } from '@/modlist/toggle-all';
import { ModItem, modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { isSeparator } from '@/lib/store/mod_separator';

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
				className={`w-full h-full hover:brightness-125 ${textColorClass}`}
			>
				{title}
			</TooltipTrigger>
			<TooltipContent>
				<p>{description}</p>
			</TooltipContent>
		</Tooltip>
	);
};

export const Header = () => {
	const selectedGame = settingStore(state => state.selectedGame);
	const toggle_type = settingStore(state => state.toggle_type);
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	const toggle_creator = settingStore(state => state.toggle_creator);
	const toggle_created_at = settingStore(state => state.toggle_created_at);
	const toggle_updated_at = settingStore(state => state.toggle_updated_at);
	const setColumnSelection = settingStore(state => state.setColumnSelection);
	const sort_by = settingStore(state => state.sort_by);
	const sort_by_direction = settingStore(state => state.sort_by_direction);
	const setSortBy = settingStore(state => state.setSortBy);
	const setSortByDirection = settingStore(state => state.setSortByDirection);

	const mods = modsStore(state => state.mods);
	const setMods = modsStore(state => state.setMods);

	const setModOrderData = modOrderStore(state => state.setData);
	const toggleBulkCategory = modMetaStore(state => state.toggleBulkCategory);
	let orderByText: any = (
		<SortByIndicator title="#" description="Sorting by load order." />
	);
	switch (sort_by) {
		case 'title':
			orderByText = (
				<SortByIndicator
					title="T"
					description="Sorting by mod title."
					textColorClass="text-blue-500"
				/>
			);
			break;
		case 'version':
			orderByText = (
				<SortByIndicator
					title="V"
					description="Sorting by mod version."
					textColorClass="text-purple-500"
				/>
			);
			break;
		case 'updated_at':
			orderByText = (
				<SortByIndicator
					title="U"
					description="Sorting by mod update time."
					textColorClass="text-green-500"
				/>
			);
			break;
		default:
			break;
	}

	const handleOnResetLoadOrder = (event: React.MouseEvent) => {
		event.stopPropagation();
		const nonSeparatorMods = mods.filter(
			mod => !isSeparator(mod),
		) as ModItem[];
		const separatorMods = mods.filter(mod => isSeparator(mod));

		let sortedMods = [...nonSeparatorMods].sort(
			(a, b) => a.created_at - b.created_at,
		);

		let iterations = 0;
		const maxIterations = sortedMods.length;
		let changed = true;

		while (changed && iterations < maxIterations) {
			changed = false;

			for (let i = 0; i < sortedMods.length; i++) {
				const mod = sortedMods[i];

				if (mod.required_items && mod.required_items.length > 0) {
					const maxParentIndex = Math.max(
						...mod.required_items
							.map(dep =>
								sortedMods.findIndex(m => m.identifier === dep),
							)
							.filter(index => index !== -1),
					);

					if (maxParentIndex !== -1 && i < maxParentIndex) {
						sortedMods.splice(i, 1);
						sortedMods.splice(maxParentIndex, 0, mod);
						changed = true;
						break;
					}
				}
			}

			iterations++;
		}

		const newArray = [...sortedMods, ...separatorMods];

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

	const handleSortByChange = (
		column: 'load_order' | 'title' | 'version' | 'updated_at',
	) => {
		if (sort_by === column && column !== 'load_order') {
			setSortByDirection(sort_by_direction === 'asc' ? 'desc' : 'asc');
		} else {
			setSortBy(column);
		}
	};

	return (
		<TableHeader>
			<TableRow>
				<TableHead className="flex items-center justify-center w-[40px] overflow-hidden">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6"
							>
								<RotateCcwIcon className="w-4 h-4" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Reset Load Order
								</AlertDialogTitle>
								<AlertDialogDescription>
									This action is irreversible. You are about
									to reset your current profile's load order.
									Automatic sorting will make sure that
									dependency checks are resolved and sorted by
									their creation date afterwards.
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
				</TableHead>
				<TableHead className="text-center w-[40px] overflow-hidden">
					{orderByText}
				</TableHead>
				<ToggleAll />
				{toggle_type && (
					<TableHead className="text-center w-[40px]">TYPE</TableHead>
				)}
				<ProfileSwitcher />
				{toggle_category && (
					<TableHead
						className="hover:cursor-pointer hover:brightness-125"
						onClick={toggleBulkCategory}
					>
						CATEGORY
					</TableHead>
				)}
				{selectedGame!.slug !== 'mbbl' && toggle_conflict && (
					<TableHead className="text-center w-[80px]">
						CONFLICT
					</TableHead>
				)}

				{toggle_version && (
					<TableHead>
						<div className="flex items-center gap-1">
							VERSION
							{sort_by === 'updated_at' &&
								(sort_by_direction === 'asc' ? (
									<ArrowDownIcon className="w-4 h-4" />
								) : (
									<ArrowUpIcon className="w-4 h-4" />
								))}
						</div>
					</TableHead>
				)}

				{toggle_creator && <TableHead>CREATOR</TableHead>}
				{toggle_created_at && <TableHead>CREATED</TableHead>}
				{toggle_updated_at && (
					<TableHead>
						<div className="flex items-center gap-1">
							UPDATED
							{sort_by === 'updated_at' &&
								(sort_by_direction === 'asc' ? (
									<ArrowDownIcon className="w-4 h-4" />
								) : (
									<ArrowUpIcon className="w-4 h-4" />
								))}
						</div>
					</TableHead>
				)}
				<TableHead className="flex justify-center w-[40px]">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="link" size="icon">
								<Grid2X2Icon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel>Columns</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={toggle_type}
								onCheckedChange={isChecked =>
									setColumnSelection('type', isChecked)
								}
							>
								Type
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_category}
								onCheckedChange={isChecked =>
									setColumnSelection('category', isChecked)
								}
							>
								Categories
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={
									selectedGame!.slug === 'mbbl'
										? false
										: toggle_conflict
								}
								onCheckedChange={isChecked =>
									setColumnSelection('conflict', isChecked)
								}
								className={
									selectedGame!.slug === 'mbbl'
										? 'text-muted-foreground'
										: ''
								}
							>
								Conflict
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_version}
								onCheckedChange={isChecked =>
									setColumnSelection('version', isChecked)
								}
							>
								Version
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_creator}
								onCheckedChange={isChecked =>
									setColumnSelection('creator', isChecked)
								}
							>
								Creator
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_created_at}
								onCheckedChange={isChecked =>
									setColumnSelection('created_at', isChecked)
								}
							>
								Created
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_updated_at}
								onCheckedChange={isChecked =>
									setColumnSelection('updated_at', isChecked)
								}
							>
								Updated
							</DropdownMenuCheckboxItem>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="flex items-center gap-1">
								Sort By
								<div className="text-xs">
									({sort_by_direction.toUpperCase()})
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={sort_by === 'load_order'}
								onCheckedChange={() =>
									handleSortByChange('load_order')
								}
							>
								Load Order
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={sort_by === 'title'}
								onCheckedChange={() =>
									handleSortByChange('title')
								}
							>
								Title
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={sort_by === 'version'}
								onCheckedChange={() =>
									handleSortByChange('version')
								}
							>
								Version
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={sort_by === 'updated_at'}
								onCheckedChange={() =>
									handleSortByChange('updated_at')
								}
							>
								Updated
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</TableHead>
			</TableRow>
		</TableHeader>
	);
};
