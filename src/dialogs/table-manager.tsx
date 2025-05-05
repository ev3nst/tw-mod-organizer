import { useShallow } from 'zustand/react/shallow';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';

import { RadioGroup, RadioGroupItem } from '@/components/radio-group';
import { settingStore } from '@/lib/store/setting';
import { Separator } from '@/components/separator';
import { Checkbox } from '@/components/checkbox';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { ArrowDownUpIcon } from 'lucide-react';

const checkboxClass = `
	border-muted-foreground
	data-[state=checked]:text-white

	[.theme-zinc_&]:dark:data-[state=checked]:bg-green-500
	[.theme-zinc_&]:dark:data-[state=checked]:border-green-800

	data-[state=checked]:bg-primary
	data-[state=checked]:border-primary/80

	shadow-none
	h-4 w-4 flex items-center justify-center
	`;

function TableManagerDialog() {
	const {
		selectedGame,
		toggle_type,
		toggle_category,
		toggle_conflict,
		toggle_version,
		toggle_creator,
		toggle_created_at,
		toggle_updated_at,
		setColumnSelection,
		sort_by,
		sort_by_direction,
		setSortBy,
		setSortByDirection,
		preview_size,
		setPreviewSize,
		tableManagerOpen,
		toggleTableManager,
	} = settingStore(
		useShallow(state => ({
			selectedGame: state.selectedGame,
			toggle_type: state.toggle_type,
			toggle_category: state.toggle_category,
			toggle_conflict: state.toggle_conflict,
			toggle_version: state.toggle_version,
			toggle_creator: state.toggle_creator,
			toggle_created_at: state.toggle_created_at,
			toggle_updated_at: state.toggle_updated_at,
			setColumnSelection: state.setColumnSelection,
			sort_by: state.sort_by,
			sort_by_direction: state.sort_by_direction,
			setSortBy: state.setSortBy,
			setSortByDirection: state.setSortByDirection,
			preview_size: state.preview_size,
			setPreviewSize: state.setPreviewSize,
			tableManagerOpen: state.tableManagerOpen,
			toggleTableManager: state.toggleTableManager,
		})),
	);

	return (
		<Dialog
			open={tableManagerOpen}
			onOpenChange={isOpen => toggleTableManager(isOpen)}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Table Manager</div>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all">
						You can configure mod list table structure from here.
					</DialogDescription>
				</DialogHeader>
				<div>
					<div className="flex gap-3">
						<div className="flex flex-col text-md font-bold mb-1">
							Toggle Columns
						</div>
					</div>
					<div className="mt-4 flex gap-3 flex-wrap">
						<label
							htmlFor="toggle_type"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_type"
								checked={toggle_type}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'type',
										isChecked as boolean,
									)
								}
							/>
							<span className="text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Type
							</span>
						</label>
						<label
							htmlFor="toggle_category"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_category"
								checked={toggle_category}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'category',
										isChecked as boolean,
									)
								}
							/>
							<span className="text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Categories
							</span>
						</label>
						<label
							htmlFor="toggle_conflict"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_conflict"
								checked={
									selectedGame!.slug === 'mbbl'
										? false
										: toggle_conflict
								}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'conflict',
										isChecked as boolean,
									)
								}
							/>
							<span
								className={`text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
									selectedGame!.slug === 'mbbl'
										? 'text-muted-foreground'
										: ''
								}`}
							>
								Conflict
							</span>
						</label>
						<label
							htmlFor="toggle_version"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_version"
								checked={toggle_version}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'version',
										isChecked as boolean,
									)
								}
							/>
							<span className="text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Version
							</span>
						</label>
						<label
							htmlFor="toggle_creator"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_creator"
								checked={toggle_creator}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'creator',
										isChecked as boolean,
									)
								}
							/>
							<span className="text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Creator
							</span>
						</label>
						<label
							htmlFor="toggle_created_at"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_created_at"
								checked={toggle_created_at}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'created_at',
										isChecked as boolean,
									)
								}
							/>
							<span className="text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Created
							</span>
						</label>
						<label
							htmlFor="toggle_updated_at"
							className="flex items-center space-x-2 border py-2 px-3 rounded-sm cursor-pointer"
						>
							<Checkbox
								id="toggle_updated_at"
								checked={toggle_updated_at}
								className={checkboxClass}
								onCheckedChange={isChecked =>
									setColumnSelection(
										'updated_at',
										isChecked as boolean,
									)
								}
							/>
							<span className="text-sm font-medium select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Updated
							</span>
						</label>
					</div>

					<Separator className="mt-5 mb-4" />
					<div className="flex gap-3">
						<div className="flex items-center gap-2 font-bold mb-3">
							<div>Sort By</div>
							<div className="text-xs text-muted-foreground">
								({sort_by_direction.toUpperCase()})
							</div>

							<Button
								size="icon"
								variant="ghost"
								disabled={sort_by === 'load_order'}
								onClick={() =>
									setSortByDirection(
										sort_by_direction === 'asc'
											? 'desc'
											: 'asc',
									)
								}
							>
								<ArrowDownUpIcon />
							</Button>
						</div>
					</div>
					<RadioGroup
						value={sort_by}
						onValueChange={value => {
							if (
								value === 'load_order' &&
								sort_by_direction === 'desc'
							) {
								setSortByDirection('asc');
							}
							setSortBy(value as any);
						}}
						className="flex"
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem
								id="sort_by_load_order"
								value="load_order"
							/>
							<Label htmlFor="sort_by_load_order">
								Load Order
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem id="sort_by_title" value="title" />
							<Label htmlFor="sort_by_title">Title</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem
								id="sort_by_version"
								value="version"
							/>
							<Label htmlFor="sort_by_version">Version</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem
								id="sort_by_updated_at"
								value="updated_at"
							/>
							<Label htmlFor="sort_by_updated_at">Updated</Label>
						</div>
					</RadioGroup>

					<Separator className="mt-5 mb-4" />
					<div className="flex gap-3">
						<div className="flex items-center gap-2 font-bold mb-3">
							<div>Preview Image Size</div>
						</div>
					</div>
					<RadioGroup
						value={preview_size.toString()}
						onValueChange={value => {
							setPreviewSize(Number(value));
						}}
						className="flex"
					>
						<label className="flex items-center space-x-2 p-2 py-1 hover:cursor-pointer hover:brightness-125 border rounded-sm">
							<RadioGroupItem id="preview_size_6" value="6" />
							<span>6</span>
						</label>

						<label className="flex items-center space-x-2 p-2 py-1 hover:cursor-pointer hover:brightness-125 border rounded-sm">
							<RadioGroupItem id="preview_size_8" value="8" />
							<span>8</span>
						</label>

						<label className="flex items-center space-x-2 p-2 py-1 hover:cursor-pointer hover:brightness-125 border rounded-sm">
							<RadioGroupItem id="preview_size_10" value="10" />
							<span>10</span>
						</label>

						<label className="flex items-center space-x-2 p-2 py-1 hover:cursor-pointer hover:brightness-125 border rounded-sm">
							<RadioGroupItem id="preview_size_12" value="12" />
							<span>12</span>
						</label>

						<label className="flex items-center space-x-2 p-2 py-1 hover:cursor-pointer hover:brightness-125 border rounded-sm">
							<RadioGroupItem id="preview_size_16" value="16" />
							<span>16</span>
						</label>

						<label className="flex items-center space-x-2 p-2 py-1 hover:cursor-pointer hover:brightness-125 border rounded-sm">
							<RadioGroupItem id="preview_size_20" value="20" />
							<span>20</span>
						</label>
					</RadioGroup>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default TableManagerDialog;
