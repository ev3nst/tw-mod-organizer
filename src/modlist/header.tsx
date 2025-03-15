import { Grid2X2Icon } from 'lucide-react';

import { TableHead, TableHeader, TableRow } from '@/components/table';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';
import { ProfileSwitcher } from '@/modlist/profile';
import { modMetaStore } from '@/lib/store/mod_meta';

import { ToggleAll } from '@/modlist/toggle-all';

export const Header = () => {
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	const setCategory = settingStore(state => state.setCategory);
	const setConflict = settingStore(state => state.setConflict);
	const setVersion = settingStore(state => state.setVersion);

	const toggleBulkCategory = modMetaStore(state => state.toggleBulkCategory);

	return (
		<TableHeader>
			<TableRow>
				<TableHead className="text-center">S</TableHead>
				<TableHead className="text-center">#</TableHead>
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
				<TableHead className="flex justify-center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="link" size="icon">
								<Grid2X2Icon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuCheckboxItem
								checked={toggle_category}
								onCheckedChange={setCategory}
							>
								Categories
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_conflict}
								onCheckedChange={setConflict}
							>
								Conflict
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={toggle_version}
								onCheckedChange={setVersion}
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
