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
			<div className="fixed inset-x-0 bottom-0 flex w-full gap-4 bg-secondary-bg shadow-[0_-1px_2px_0_hsl(var(--secondary-border)/0.6)]">
				<div>
					<Select
						value={activationFilter}
						onValueChange={setActivationFilter}
					>
						<SelectTrigger
							className="h-full w-[100px] justify-center rounded-none border-y-0 border-l-0 border-secondary-border"
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
				<div className=" relative flex w-[calc(100%-350px)] items-center justify-between">
					<div className="grow border-r border-secondary-border">
						<SearchIcon className="absolute bottom-[12px] size-3.5 text-muted-foreground" />
						<Input
							ref={searchInputRef}
							className="h-10 rounded-none border-0 ps-6"
							placeholder="C: Category (Optional) - Search Term ..."
							defaultValue={searchModText}
							onChange={handleSearchChange}
						/>
					</div>
					<div className="flex w-[340px] items-center gap-3 ps-3 text-sm">
						<div>Mod Count:</div>

						<Tooltip>
							<TooltipTrigger className="text-green-500 hover:cursor-default hover:brightness-125">
								A: {activeMods}
							</TooltipTrigger>
							<TooltipContent>
								<p>Active mod count.</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger className="text-red-500 hover:cursor-default hover:brightness-125">
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
