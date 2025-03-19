import { Grid2X2Icon } from 'lucide-react';

import { TableHead, TableHeader, TableRow } from '@/components/table';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';
import { ProfileSwitcher } from '@/modlist/profile';
import { modMetaStore } from '@/lib/store/mod_meta';

import { ToggleAll } from '@/modlist/toggle-all';

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
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	const toggle_creator = settingStore(state => state.toggle_creator);
	const setColumnSelection = settingStore(state => state.setColumnSelection);
	const sort_by = settingStore(state => state.sort_by);
	const setSortBy = settingStore(state => state.setSortBy);

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
		default:
			break;
	}

	return (
		<TableHeader>
			<TableRow>
				<TableHead className="text-center">S</TableHead>
				<TableHead className="text-center">{orderByText}</TableHead>
				<ToggleAll />
				<ProfileSwitcher />
				{toggle_category && (
					<TableHead
						className="hover:cursor-pointer hover:brightness-125"
						onClick={() => toggleBulkCategory()}
					>
						CATEGORY
					</TableHead>
				)}
				{toggle_conflict && (
					<TableHead className="text-center">CONFLICT</TableHead>
				)}
				{toggle_version && <TableHead>VERSION</TableHead>}
				{toggle_creator && <TableHead>CREATOR</TableHead>}
				<TableHead className="flex justify-center">
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
								checked={toggle_category}
								onCheckedChange={isChecked =>
									setColumnSelection('category', isChecked)
								}
							>
								Categories
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_conflict}
								onCheckedChange={isChecked =>
									setColumnSelection('conflict', isChecked)
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
							<DropdownMenuSeparator />
							<DropdownMenuLabel>Sort By</DropdownMenuLabel>
							<DropdownMenuCheckboxItem
								checked={sort_by === 'load_order'}
								onCheckedChange={() => setSortBy('load_order')}
							>
								Load Order
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={sort_by === 'title'}
								onCheckedChange={() => setSortBy('title')}
							>
								Title
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={sort_by === 'version'}
								onCheckedChange={() => setSortBy('version')}
							>
								Version
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</TableHead>
			</TableRow>
		</TableHeader>
	);
};
