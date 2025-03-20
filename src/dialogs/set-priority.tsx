import { ChangeEvent, useState } from 'react';

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

import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';

function SetPriorityDialog() {
	const [priority, setPriority] = useState<string>('');

	const mods = modsStore(state => state.mods);
	const setMods = modsStore(state => state.setMods);

	const setModOrder = modOrderStore(state => state.setData);
	const priorityOpen = modOrderStore(state => state.priorityOpen);
	const selectedMod = modOrderStore(state => state.selectedMod);
	const toggleSetPriority = modOrderStore(state => state.toggleSetPriority);

	const handlePriorityChange = (event: ChangeEvent<HTMLInputElement>) => {
		let normalized: string | number = event.currentTarget.value.trim();
		if (normalized === '') {
			setPriority(normalized.toString());
			return;
		}

		normalized = Number(normalized);
		if (!Number.isNaN(normalized)) {
			if (normalized > mods.length) {
				normalized = mods.length;
			}

			if (normalized < 1) {
				normalized = 1;
			}

			setPriority(normalized.toString());
		}
	};

	const handleSubmit = () => {
		const priorityNum = Number(priority);
		if (Number.isNaN(priorityNum) || priorityNum < 1) return;

		const oldIndex = mods.findIndex(
			item => item.identifier === selectedMod.identifier,
		);
		const newArray = [...mods];
		const [movedItem] = newArray.splice(oldIndex, 1);
		newArray.splice(priorityNum - 1, 0, movedItem);
		setMods(newArray);
		setModOrder(
			newArray.map((na, ni) => ({
				mod_id: na.identifier,
				order: ni + 1,
				title: na.title,
				pack_file_path:
					'pack_file_path' in na ? na.pack_file_path : undefined,
			})),
		);
		toggleSetPriority();
	};

	return (
		<Dialog
			open={priorityOpen && typeof selectedMod !== 'undefined'}
			onOpenChange={() => toggleSetPriority()}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Set Priority</div>
						<div className="text-sm text-muted-foreground">
							{selectedMod.title}
						</div>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all">
						{selectedMod?.pack_file}
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-between items-end gap-4">
					<div className="flex flex-col gap-3 flex-grow">
						<Label>Priority</Label>
						<Input
							value={priority}
							onChange={handlePriorityChange}
							autoComplete="off"
							className="col-span-3"
						/>
					</div>
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

export default SetPriorityDialog;
