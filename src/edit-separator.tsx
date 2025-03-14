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

import { settingStore } from '@/lib/store/setting';
import { modSeparatorStore } from '@/lib/store/mod_separator';
import { toastError } from '@/lib/utils';

export function EditSeparator() {
	const [title, setTitle] = useState<string>('');

	const init_reload = settingStore(state => state.init_reload);
	const setInitReload = settingStore(state => state.setInitReload);

	const editSeparatorDialogOpen = modSeparatorStore(
		state => state.editSeparatorDialogOpen,
	);
	const selectedSeparator = modSeparatorStore(
		state => state.selectedSeparator,
	);
	const toggleEditSeparator = modSeparatorStore(
		state => state.toggleEditSeparator,
	);
	const separators = modSeparatorStore(state => state.data);
	const setSeparators = modSeparatorStore(state => state.setData);

	if (!selectedSeparator) return;

	const selectedSeparatorMeta = separators.find(
		md => md.identifier === selectedSeparator.identifier,
	);

	let titlePlaceholder = selectedSeparator.title;
	if (
		typeof selectedSeparatorMeta !== 'undefined' &&
		typeof selectedSeparatorMeta.title !== 'undefined' &&
		selectedSeparatorMeta.title !== null &&
		selectedSeparatorMeta.title !== ''
	) {
		titlePlaceholder = selectedSeparatorMeta.title;
	}

	const handleSubmit = () => {
		try {
			setSeparators(
				separators.map(m => {
					if (m.identifier === selectedSeparator.identifier) {
						return {
							...m,
							title: title !== '' ? title : m.title,
						};
					}

					return m;
				}),
			);
			toggleEditSeparator();
			toast.success('Separator details changed.');
			setInitReload(!init_reload);
		} catch (error) {
			toastError(error);
		}
	};

	return (
		<Dialog
			open={
				editSeparatorDialogOpen &&
				typeof selectedSeparator !== 'undefined'
			}
			onOpenChange={() => toggleEditSeparator()}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Change Meta Information</div>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all">
						{selectedSeparator.title}
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
