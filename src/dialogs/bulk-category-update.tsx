import { useState, ChangeEvent, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowRightIcon, PlusIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Input } from '@/components/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/select';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';
import { Button } from '@/components/button';

import { modsStore, type ModItem } from '@/lib/store/mods';
import { modActivationStore } from '@/lib/store/mod_activation';
import { filterMods, modMetaStore } from '@/lib/store/mod_meta';
import { isSeparator } from '@/lib/store/mod_separator';
import { toastError } from '@/lib/utils';

function BulkCategoryUpdateDialog() {
	const [modsToChange, setModsToChange] = useState<ModItem[]>([]);

	const [searchModText, setSearchModText] = useState<string>('');
	const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
		setSearchModText(event.currentTarget.value);
	const [activationFilter, setActivationFilter] = useState<string>('all');

	const [categoriesToAdd, setCategoriesToAdd] = useState<string>('');
	const handleCategoryChange = (event: ChangeEvent<HTMLInputElement>) =>
		setCategoriesToAdd(event.currentTarget.value);

	const [categoriesToRemove, setCategoriesToRemove] = useState<string>('');
	const handleCategoryRemoveChange = (event: ChangeEvent<HTMLInputElement>) =>
		setCategoriesToRemove(event.currentTarget.value);

	const mods = modsStore(state => state.mods);

	const {
		metaData,
		setMetaData,
		bulkCategoryDialogOpen,
		toggleBulkCategory,
	} = modMetaStore(
		useShallow(state => ({
			metaData: state.data,
			setMetaData: state.setData,
			bulkCategoryDialogOpen: state.bulkCategoryDialogOpen,
			toggleBulkCategory: state.toggleBulkCategory,
		})),
	);

	const modActiveData = modActivationStore(state => state.data);

	const modsResolved = useMemo(() => {
		return mods.map(rm => {
			if (isSeparator(rm)) return rm;

			const rmMeta = metaData.find(md => md.mod_id === rm.identifier);
			return {
				...rm,
				title:
					typeof rmMeta?.title !== 'undefined' &&
					rmMeta?.title !== null &&
					rmMeta?.title !== ''
						? rmMeta.title
						: rm.title,
				categories:
					typeof rmMeta?.categories !== 'undefined' &&
					rmMeta?.categories !== null &&
					rmMeta?.categories !== ''
						? rmMeta.categories
						: (rm as ModItem).categories,
			};
		});
	}, [mods, metaData]);

	const filteredMods = useMemo(() => {
		return filterMods(
			searchModText,
			activationFilter,
			modsResolved,
			metaData,
			modActiveData,
		).filter(mod => !isSeparator(mod)) as ModItem[];
	}, [modsResolved, searchModText, activationFilter]);

	function applyCategoryChanges(
		existingCategories: string,
		add: string,
		remove: string,
	) {
		let updatedCategories = existingCategories;
		if (remove) {
			const categoryList = updatedCategories
				.split(',')
				.map(cat => cat.trim())
				.filter(Boolean);
			const removalList = remove
				.split(',')
				.map(cat => cat.trim())
				.filter(Boolean);
			updatedCategories = categoryList
				.filter(
					cat =>
						!removalList.some(
							r => r.toLowerCase() === cat.toLowerCase(),
						),
				)
				.join(', ');
		}
		if (add) {
			const trimmedUpdated = updatedCategories.trim();
			const commaExt = trimmedUpdated !== '' ? ', ' : '';
			updatedCategories = `${trimmedUpdated}${commaExt}${add}`;
		}
		return updatedCategories;
	}

	const handleSubmit = async () => {
		try {
			const newMetaData = metaData.map(md => {
				if (modsToChange.some(s => s.identifier === md.mod_id)) {
					let existingCategories = md.categories;
					const modDetails = mods.find(
						m => m.identifier === md.mod_id,
					) as ModItem;
					if (
						typeof existingCategories === 'undefined' ||
						existingCategories === null ||
						existingCategories === ''
					) {
						existingCategories = modDetails.categories;
					}

					const updatedCategories = applyCategoryChanges(
						existingCategories,
						categoriesToAdd,
						categoriesToRemove,
					);

					return {
						...md,
						categories: updatedCategories,
					};
				}

				return md;
			});
			setMetaData(newMetaData);

			toast.success('Categories are updated.');
			setCategoriesToAdd('');
			setCategoriesToRemove('');
			setModsToChange([]);
		} catch (error) {
			toastError(error);
		}
	};

	return (
		<Dialog
			open={bulkCategoryDialogOpen}
			onOpenChange={() => toggleBulkCategory()}
		>
			<DialogContent className="min-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						<div>Bulk Update Categories</div>
					</DialogTitle>
					<DialogDescription className="mt-1 break-all text-xs"></DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2.5">
					<div className="flex items-center justify-between gap-2">
						<Select
							value={activationFilter}
							onValueChange={value => setActivationFilter(value)}
						>
							<SelectTrigger className="w-[100px]" disableIcon>
								<SelectValue placeholder={activationFilter} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="passive">Passive</SelectItem>
							</SelectContent>
						</Select>
						<Input
							className="grow"
							placeholder="C: Category (Optional) - Search Term ..."
							onChange={handleSearchChange}
						/>
					</div>
					<Input
						className="grow"
						placeholder="New categories to add (eg. Empire, Lords)"
						defaultValue={categoriesToAdd}
						onChange={handleCategoryChange}
					/>
					<Input
						className="grow"
						placeholder="Categories to remove (eg. Empire, Lords)"
						defaultValue={categoriesToRemove}
						onChange={handleCategoryRemoveChange}
					/>

					<Accordion
						type="single"
						collapsible
						defaultValue="mods"
						className="w-full"
					>
						<AccordionItem value="mods">
							<AccordionTrigger>
								Mods ({filteredMods.length})
							</AccordionTrigger>
							<AccordionContent>
								<div className="max-h-[180px] divide-y overflow-y-auto">
									{filteredMods.map(m => (
										<div
											className="flex justify-between border-secondary-border/60 px-4 py-2 text-xs hover:bg-secondary-bg"
											key={`bulk_c_filt_mod_${m.identifier}`}
										>
											<div className="flex gap-1">
												<div>{m.title}</div>
												<div className="text-muted-foreground">
													- <em>{m.categories}</em>
												</div>
											</div>

											<div
												className="hover:cursor-pointer hover:text-green-500"
												onClick={() =>
													setModsToChange(prev =>
														prev.some(
															f =>
																f.identifier ===
																m.identifier,
														)
															? prev
															: [...prev, m],
													)
												}
											>
												<PlusIcon className="size-4" />
											</div>
										</div>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="preview">
							<AccordionTrigger>
								Preview ({modsToChange.length})
							</AccordionTrigger>
							<AccordionContent>
								<div className="max-h-[200px] overflow-y-auto">
									{modsToChange.map(mtc => {
										const previewCategories =
											applyCategoryChanges(
												mtc.categories,
												categoriesToAdd,
												categoriesToRemove,
											);
										return (
											<div
												className="flex justify-between px-4 py-2 text-xs hover:bg-black/80"
												key={`bulk_c_preview_mod_${mtc.identifier}`}
											>
												<div className="flex flex-col gap-1">
													<div>{mtc.title}</div>
													{categoriesToAdd !== '' ||
													categoriesToRemove !==
														'' ? (
														<div className="flex items-center gap-2">
															<div className="text-red-500">
																{mtc.categories}
															</div>
															<ArrowRightIcon className="size-4" />
															<div className="text-green-500">
																{
																	previewCategories
																}
															</div>
														</div>
													) : (
														<span className="text-muted-foreground">
															{mtc.categories}
														</span>
													)}
												</div>

												<div
													className="hover:cursor-pointer hover:text-red-500"
													onClick={() =>
														setModsToChange(
															modsToChange.filter(
																f =>
																	f.identifier !==
																	mtc.identifier,
															),
														)
													}
												>
													<XIcon className="size-4" />
												</div>
											</div>
										);
									})}
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<Button
						type="button"
						variant="secondary"
						onClick={handleSubmit}
					>
						Change
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default BulkCategoryUpdateDialog;
