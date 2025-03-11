import { useState } from 'react';

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

import { modMetaStore } from './lib/store/mod_meta';

export function MetaInformationDialog() {
	const [categories, setCategories] = useState<string>('');

	const metaInfoOpen = modMetaStore(state => state.metaInfoOpen);
	const selectedMod = modMetaStore(state => state.selectedMod);
	const toggleMetaInfo = modMetaStore(state => state.toggleMetaInfo);
	const metaData = modMetaStore(state => state.data);
	const setMetaData = modMetaStore(state => state.setData);

	const selectedModMeta = metaData.find(
		md => md.mod_id === selectedMod.identifier,
	);

	let placeholder = selectedMod.categories;
	if (
		typeof selectedModMeta !== 'undefined' &&
		selectedModMeta.categories !== null &&
		selectedModMeta.categories !== ''
	) {
		placeholder = selectedModMeta.categories;
	}

	const handleSubmit = () => {
		setMetaData(
			metaData.map(m => {
				if (m.mod_id === selectedMod.identifier) {
					return {
						...m,
						categories,
					};
				}

				return m;
			}),
		);
		toggleMetaInfo();
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
						<Label>Categories</Label>
						<Input
							autoComplete="off"
							autoCorrect="off"
							className="col-span-3"
							placeholder={placeholder}
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
