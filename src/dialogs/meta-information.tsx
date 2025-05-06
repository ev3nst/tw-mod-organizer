import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';

import { modMetaStore } from '@/lib/store/mod_meta';
import { toastError } from '@/lib/utils';

function MetaInformationDialog() {
	const [title, setTitle] = useState<string>('');
	const [categories, setCategories] = useState<string>('');

	const { metaInfoOpen, selectedMod, toggleMetaInfo, metaData, setMetaData } =
		modMetaStore(
			useShallow(state => ({
				metaInfoOpen: state.metaInfoOpen,
				selectedMod: state.selectedMod,
				toggleMetaInfo: state.toggleMetaInfo,
				metaData: state.data,
				setMetaData: state.setData,
			})),
		);

	const selectedModMeta = useMemo(
		() => metaData.find(md => md.mod_id === selectedMod.identifier),
		[metaData, selectedMod.identifier],
	);

	let titlePlaceholder = selectedMod.title;
	if (
		typeof selectedModMeta !== 'undefined' &&
		typeof selectedModMeta.title !== 'undefined' &&
		selectedModMeta.title !== null &&
		selectedModMeta.title !== ''
	) {
		titlePlaceholder = selectedModMeta.title;
	}

	let categoriesPlaceholder = selectedMod.categories;
	if (
		typeof selectedModMeta !== 'undefined' &&
		typeof selectedModMeta.categories !== 'undefined' &&
		selectedModMeta.categories !== null &&
		selectedModMeta.categories !== ''
	) {
		categoriesPlaceholder = selectedModMeta.categories;
	}

	const handleSubmit = () => {
		const newTitle = title.trim();
		let newCategories = categories.trim();
		if (newCategories.endsWith(',')) {
			newCategories = newCategories.slice(0, -1);
		}

		try {
			const newMetaData = metaData.map(m => {
				if (m.mod_id === selectedMod.identifier) {
					return {
						...m,
						title: newTitle,
						categories: newCategories,
					};
				}

				return m;
			});
			setMetaData(newMetaData);
			toggleMetaInfo();
			toast.success('Mod meta details changed.');
		} catch (error) {
			toastError(error);
		}
	};

	return (
		<Dialog
			open={metaInfoOpen && typeof selectedMod !== 'undefined'}
			onOpenChange={() => toggleMetaInfo()}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Change Meta Information</div>
					</DialogTitle>
					<DialogDescription className="mt-1 break-all text-xs">
						{selectedMod.title}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-4 items-center gap-3">
						<Label>Title</Label>
						<Input
							autoComplete="off"
							autoCorrect="off"
							className="col-span-3"
							placeholder={selectedModMeta?.title}
							defaultValue={titlePlaceholder}
							onChange={e => setTitle(e.currentTarget.value)}
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-3">
						<Label>Categories</Label>
						<Input
							autoComplete="off"
							autoCorrect="off"
							className="col-span-3"
							placeholder={selectedMod.categories}
							defaultValue={categoriesPlaceholder}
							onChange={e => setCategories(e.currentTarget.value)}
						/>
					</div>
					<p className="text-sm">
						You may define multiple categories separating by comma.
						<span className="block text-muted-foreground">
							(eg. Graphical, Texture)
						</span>
					</p>

					<Button
						type="button"
						variant="secondary"
						onClick={handleSubmit}
					>
						Save
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default MetaInformationDialog;
