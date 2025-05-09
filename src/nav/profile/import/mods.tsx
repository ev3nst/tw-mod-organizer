import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';

import { useMemo, useState } from 'react';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { PaginationControls } from '@/components/pagination-controls';

import type { ModItem } from '@/lib/store/mods';
import type { ModMetaItem } from '@/lib/store/mod_meta';

import { ModItemComponent } from './mod-item';

type ModsProps = {
	steamModExists: ModItem[];
	steamModDontExists: ModItem[];
	nexusModsExists: ModItem[];
	nexusModsDontExists: ModItem[];
	localModsExists: ModItem[];
	localModsDontExists: ModItem[];
	profileExportMods: ModItem[];
	modsOnly: ModItem[];
	modMetaData: ModMetaItem[];
	onRemoveMod: (mod: ModItem) => void;
};

type StateFilter =
	| 'all'
	| 'steam-present'
	| 'steam-missing'
	| 'nexus-present'
	| 'nexus-missing'
	| 'local-present'
	| 'local-missing';

export const Mods = ({
	steamModExists,
	steamModDontExists,
	nexusModsExists,
	nexusModsDontExists,
	localModsExists,
	localModsDontExists,
	profileExportMods,
	modsOnly,
	modMetaData,
	onRemoveMod,
}: ModsProps) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(10);
	const [stateFilter, setStateFilter] = useState<StateFilter>('all');

	const filteredMods = useMemo(() => {
		let mods = profileExportMods.filter(m => m.item_type !== 'base_mod');

		switch (stateFilter) {
			case 'steam-present':
				mods = steamModExists;
				break;
			case 'steam-missing':
				mods = steamModDontExists;
				break;
			case 'nexus-present':
				mods = nexusModsExists;
				break;
			case 'nexus-missing':
				mods = nexusModsDontExists;
				break;
			case 'local-present':
				mods = localModsExists;
				break;
			case 'local-missing':
				mods = localModsDontExists;
				break;
			default:
				break;
		}

		if (searchQuery.trim()) {
			mods = mods.filter(
				mod =>
					mod.title
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					mod.mod_file
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			);
		}

		return mods;
	}, [
		profileExportMods,
		steamModExists,
		steamModDontExists,
		nexusModsExists,
		nexusModsDontExists,
		localModsExists,
		localModsDontExists,
		searchQuery,
		stateFilter,
	]);

	const totalItems = filteredMods.length;
	const paginatedMods = filteredMods.slice(
		(currentPage - 1) * perPage,
		currentPage * perPage,
	);

	return (
		<AccordionItem value="mods">
			<AccordionTrigger className="text-md">
				<div className="flex gap-2">
					<span>Mods</span>
					<span className="text-white">
						({steamModExists.length})
					</span>
					<span className="text-muted-foreground">
						({steamModDontExists.length})
					</span>
					<span className="text-blue-500">
						({nexusModsExists.length})
					</span>
					<span className="text-purple-500">
						({nexusModsDontExists.length})
					</span>
					<span className="text-orange-500">
						({localModsExists.length})
					</span>
					<span className="text-red-500">
						({localModsDontExists.length})
					</span>
				</div>
			</AccordionTrigger>
			<AccordionContent className="p-0 sm:max-w-[540px]">
				<div className="mb-2 flex flex-wrap items-center gap-2">
					<Input
						placeholder="Search mods..."
						value={searchQuery}
						onChange={e => {
							setSearchQuery(e.target.value);
							setCurrentPage(1);
						}}
						className="w-64"
					/>
					<Button
						size="sm"
						variant={stateFilter === 'all' ? 'default' : 'ghost'}
						onClick={() => {
							setStateFilter('all');
							setCurrentPage(1);
						}}
					>
						All
					</Button>
					<Button
						size="sm"
						className="text-white"
						variant={
							stateFilter === 'steam-present'
								? 'secondary'
								: 'ghost'
						}
						onClick={() => {
							setStateFilter('steam-present');
							setCurrentPage(1);
						}}
					>
						<span className="mr-1 inline-block size-3 rounded-full border bg-white align-middle" />
						Steam Present
					</Button>
					<Button
						size="sm"
						className="text-muted-foreground"
						variant={
							stateFilter === 'steam-missing'
								? 'secondary'
								: 'ghost'
						}
						onClick={() => {
							setStateFilter('steam-missing');
							setCurrentPage(1);
						}}
					>
						<span className="mr-1 inline-block size-3 rounded-full bg-muted-foreground align-middle" />
						Steam Missing
					</Button>
					<Button
						size="sm"
						className="text-blue-500"
						variant={
							stateFilter === 'nexus-present'
								? 'secondary'
								: 'ghost'
						}
						onClick={() => {
							setStateFilter('nexus-present');
							setCurrentPage(1);
						}}
					>
						<span className="mr-1 inline-block size-3 rounded-full bg-blue-500 align-middle" />
						Nexus Present
					</Button>
					<Button
						size="sm"
						className="text-purple-500"
						variant={
							stateFilter === 'nexus-missing'
								? 'secondary'
								: 'ghost'
						}
						onClick={() => {
							setStateFilter('nexus-missing');
							setCurrentPage(1);
						}}
					>
						<span className="mr-1 inline-block size-3 rounded-full bg-purple-500 align-middle" />
						Nexus Missing
					</Button>
					<Button
						size="sm"
						className="text-orange-500"
						variant={
							stateFilter === 'local-present'
								? 'secondary'
								: 'ghost'
						}
						onClick={() => {
							setStateFilter('local-present');
							setCurrentPage(1);
						}}
					>
						<span className="mr-1 inline-block size-3 rounded-full bg-orange-500 align-middle" />
						Local Present
					</Button>
					<Button
						size="sm"
						className="text-red-500"
						variant={
							stateFilter === 'local-missing'
								? 'secondary'
								: 'ghost'
						}
						onClick={() => {
							setStateFilter('local-missing');
							setCurrentPage(1);
						}}
					>
						<span className="mr-1 inline-block size-3 rounded-full bg-red-500 align-middle" />
						Local Missing
					</Button>
				</div>
				<div className="flex flex-col gap-2">
					{paginatedMods.length > 0 ? (
						paginatedMods.map(mod => (
							<ModItemComponent
								key={mod.identifier}
								modsOnly={modsOnly}
								modMetaData={modMetaData}
								item={mod}
								onRemoveMod={onRemoveMod}
							/>
						))
					) : (
						<div className="py-4 text-center text-muted-foreground">
							No mods found
						</div>
					)}
				</div>
				<div className="mt-3">
					<PaginationControls
						currentPage={currentPage}
						totalItems={totalItems}
						perPage={perPage}
						onPageChange={setCurrentPage}
						onPerPageChange={newPerPage => {
							setPerPage(newPerPage);
							setCurrentPage(1);
						}}
						isCompact
					/>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
};
