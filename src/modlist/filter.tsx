import { ChangeEvent, useEffect, useRef, memo, useMemo } from 'react';
import { SearchIcon } from 'lucide-react';

import { Input } from '@/components/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';
import { modsStore } from '@/lib/store/mods';
import { isSeparator } from '@/lib/store/mod_separator';
import { modActivationStore } from '@/lib/store/mod_activation';

type FilterProps = {
	activationFilter: string;
	setActivationFilter: (value: string) => void;
	searchModText: string;
	setSearchModText: (value: string) => void;
};

export const Filter = memo(
	({
		activationFilter,
		setActivationFilter,
		searchModText,
		setSearchModText,
	}: FilterProps) => {
		const searchInputRef = useRef<HTMLInputElement>(null);

		const mods = modsStore(state => state.mods);
		const onlyMods = useMemo(
			() => mods.filter(m => !isSeparator(m)),
			[mods],
		);
		const modActiveData = modActivationStore(state => state.data);

		const { activeMods, passiveMods } = useMemo(
			() => ({
				activeMods: modActiveData.filter(
					f => !f.mod_id.startsWith('separator_') && f.is_active,
				).length,
				passiveMods: modActiveData.filter(
					f => !f.mod_id.startsWith('separator_') && !f.is_active,
				).length,
			}),
			[modActiveData],
		);

		useEffect(() => {
			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.ctrlKey && event.key === 'f') {
					event.preventDefault();
					searchInputRef.current?.focus();
				}
			};
			document.addEventListener('keydown', handleKeyDown);
			return () => {
				document.removeEventListener('keydown', handleKeyDown);
			};
		}, []);

		const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
			setSearchModText(event.currentTarget.value);

		return (
			<div className="fixed bottom-0 left-0 right-0 bg-secondary-bg w-full flex gap-4 shadow-[0_-1px_2px_0_hsl(var(--secondary-border)/0.6)]">
				<div>
					<Select
						value={activationFilter}
						onValueChange={setActivationFilter}
					>
						<SelectTrigger
							className="w-[100px] justify-center rounded-none h-full border-t-0 border-l-0 border-b-0 border-secondary-border"
							disableIcon
						>
							<SelectValue placeholder={activationFilter} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="passive">Passive</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className=" relative flex items-center justify-between w-[calc(100%-350px)]">
					<div className="flex-grow border-r border-secondary-border">
						<SearchIcon className="absolute bottom-[12px] w-3.5 h-3.5 text-muted-foreground" />
						<Input
							ref={searchInputRef}
							className="rounded-none ps-6 h-10 border-0"
							placeholder="C: Category (Optional) - Search Term ..."
							defaultValue={searchModText}
							onChange={handleSearchChange}
						/>
					</div>
					<div className="ps-3 w-[340px] gap-3 flex items-center text-sm">
						<div>Mod Count:</div>

						<Tooltip>
							<TooltipTrigger className="hover:cursor-default hover:brightness-125 text-green-500">
								A: {activeMods}
							</TooltipTrigger>
							<TooltipContent>
								<p>Active mod count.</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger className="hover:cursor-default hover:brightness-125 text-red-500">
								P: {passiveMods}
							</TooltipTrigger>
							<TooltipContent>
								<p>Passive mod count.</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger className="hover:cursor-default hover:brightness-125">
								T: {onlyMods.length}
							</TooltipTrigger>
							<TooltipContent>
								<p>Total mod count.</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) =>
		prevProps.activationFilter === nextProps.activationFilter &&
		prevProps.searchModText === nextProps.searchModText,
);
