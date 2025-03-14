import { useState } from 'react';
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

export function MetaInformationDialog() {
	const [title, setTitle] = useState<string>('');
	const [categories, setCategories] = useState<string>('');

	const metaInfoOpen = modMetaStore(state => state.metaInfoOpen);
	const selectedMod = modMetaStore(state => state.selectedMod);
	const toggleMetaInfo = modMetaStore(state => state.toggleMetaInfo);
	const metaData = modMetaStore(state => state.data);
	const setMetaData = modMetaStore(state => state.setData);

	const selectedModMeta = metaData.find(
		md => md.mod_id === selectedMod.identifier,
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
		try {
			setMetaData(
				metaData.map(m => {
					if (m.mod_id === selectedMod.identifier) {
						return {
							...m,
							title: title !== '' ? title : m.title,
							categories:
								categories !== '' ? categories : m.categories,
						};
					}

					return m;
				}),
			);
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
					<DialogDescription className="text-xs mt-1 break-all">
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
							placeholder={titlePlaceholder}
							value={title}
							onChange={e => setTitle(e.currentTarget.value)}
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-3">
						<Label>Categories</Label>
						<Input
							autoComplete="off"
							autoCorrect="off"
							className="col-span-3"
							placeholder={categoriesPlaceholder}
							value={categories}
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
