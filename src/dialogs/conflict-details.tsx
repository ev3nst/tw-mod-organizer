import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';

import { conflictsStore } from '@/lib/store/conflict';

const ConflictCaseItem = ({
	title,
	cases,
	color,
	defaultActive,
}: {
	title: string;
	cases: any[];
	color: string;
	defaultActive: boolean;
}) => {
	return (
		<Accordion
			type="single"
			collapsible
			defaultValue={
				defaultActive ? `conflict_case_item_${title}` : undefined
			}
			className="max-w-[650px]"
		>
			<AccordionItem value={`conflict_case_item_${title}`}>
				<AccordionTrigger className={`text-${color}-500 py-2`}>
					{title} ({cases.length})
				</AccordionTrigger>
				<AccordionContent>
					{cases.map((d: string) => (
						<div key={`cci_${d}`} className="text-xs ps-4 truncate">
							- {d}
						</div>
					))}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};

const ConflictItem = ({
	name,
	titles,
	cases,
	color,
}: {
	name: string;
	titles: string[];
	cases: any;
	color: string;
}) => {
	return (
		<AccordionItem value={`conflict_item_${name}`}>
			<AccordionTrigger className="py-2">
				{name} ({titles.length})
			</AccordionTrigger>
			<AccordionContent>
				<div className="text-sm flex flex-col gap-2 h-[300px] overflow-y-auto">
					{titles.map((title: string, ti) => (
						<ConflictCaseItem
							key={`conflict_case_${name}_${title}_${ti}`}
							defaultActive={ti === 0}
							title={title}
							cases={cases[title]}
							color={color}
						/>
					))}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
};

const ConflictDetailsDialog = () => {
	const setCurrentConflict = conflictsStore(
		state => state.setCurrentConflict,
	);
	const currentConflict = conflictsStore(state => state.currentConflict);
	const currentConflictData = conflictsStore(
		state => state.currentConflictData,
	);

	if (!currentConflict || !currentConflictData) return null;

	const winTitles = Object.keys(currentConflictData.win.cases);
	const loseTitles = Object.keys(currentConflictData.lose.cases);

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setCurrentConflict(undefined, undefined);
		}
	};

	return (
		<Dialog
			open={typeof currentConflict !== 'undefined'}
			onOpenChange={handleOpenChange}
		>
			<DialogContent className="min-w-[700px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Conflicts</div>
						<div className="text-sm text-muted-foreground">
							{currentConflictData.mod.title}
						</div>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all">
						{currentConflictData.mod.mod_file_path}
					</DialogDescription>
				</DialogHeader>
				<Accordion
					type="single"
					collapsible
					className="max-w-[650px]"
					defaultValue={
						currentConflictData.win.total > 0
							? 'conflict_item_Winning'
							: 'conflict_item_Losing'
					}
				>
					{currentConflictData.win.total > 0 && (
						<ConflictItem
							name="Winning"
							titles={winTitles}
							cases={currentConflictData.win.cases}
							color="green"
						/>
					)}

					{currentConflictData.lose.total > 0 && (
						<ConflictItem
							name="Losing"
							titles={loseTitles}
							cases={currentConflictData.lose.cases}
							color="red"
						/>
					)}
				</Accordion>
			</DialogContent>
		</Dialog>
	);
};

export default ConflictDetailsDialog;
