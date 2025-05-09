import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';

import { Label } from '@/components/label';
import { Button } from '@/components/button';

import { ModItem, modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { ModSeparatorItem, modSeparatorStore } from '@/lib/store/mod_separator';
import { normalizeOrder } from '@/lib/utils';
import { Input } from '@/components/input';

function SendToSeparatorDialog() {
	const [selectedSeparator, setSelectedSeparator] =
		useState<ModSeparatorItem>();
	const [search, setSearch] = useState('');

	const { mods, setMods } = modsStore(
		useShallow(state => ({
			mods: state.mods,
			setMods: state.setMods,
		})),
	);

	const {
		modOrderData,
		setModOrderData,
		sendToSeparatorOpen,
		selectedMod,
		toggleSendToSeparator,
	} = modOrderStore(
		useShallow(state => ({
			modOrderData: state.data,
			setModOrderData: state.setData,
			sendToSeparatorOpen: state.sendToSeparatorOpen,
			selectedMod: state.selectedMod,
			toggleSendToSeparator: state.toggleSendToSeparator,
		})),
	);

	const separators = modSeparatorStore(state => state.data);
	const filteredSeparators = useMemo(
		() =>
			separators.filter(
				separator =>
					separator.title
						.toLowerCase()
						.includes(search.toLowerCase()) ||
					separator.title.toLowerCase() === search.toLowerCase(),
			),
		[separators, search],
	);

	const handleSend = () => {
		if (!selectedSeparator || !selectedMod) return;

		const selectedSeparatorOrderData = modOrderData.find(
			m => m.mod_id === selectedSeparator.identifier,
		);
		if (!selectedSeparatorOrderData) return;

		const nextSeparatorOrder = modOrderData
			.filter(m => separators.some(s => s.identifier === m.mod_id))
			.find(m => m.order > selectedSeparatorOrderData.order)?.order;

		const currentModOrder = modOrderData.find(
			m => m.mod_id === selectedMod.identifier,
		);
		if (!currentModOrder) return;

		let newModOrderData = modOrderData.filter(
			m => m.mod_id !== selectedMod.identifier,
		);

		const newOrder = nextSeparatorOrder
			? nextSeparatorOrder - 0.5
			: selectedSeparatorOrderData.order + 1;

		newModOrderData.push({
			mod_id: selectedMod.identifier,
			order: newOrder,
			title: selectedMod.title,
			mod_file_path:
				'mod_file_path' in selectedMod
					? selectedMod.mod_file_path
					: undefined,
		});

		const normalizedOrder = normalizeOrder(newModOrderData);
		const orderMap: Record<string, number> = normalizedOrder.reduce(
			(acc: any, item: any) => {
				acc[item.mod_id] = item.order;
				return acc;
			},
			{} as Record<string, number>,
		);
		const sortedMods = [...mods].sort((a, b) => {
			return orderMap[a.identifier] - orderMap[b.identifier];
		});
		setMods(sortedMods);

		setModOrderData(normalizedOrder);
		toggleSendToSeparator();
	};

	return (
		<Dialog
			open={sendToSeparatorOpen && typeof selectedMod !== 'undefined'}
			onOpenChange={() => toggleSendToSeparator()}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div className="whitespace-nowrap">
							Send to Separator
						</div>
						<div className="text-sm text-muted-foreground">
							{selectedMod.title}
						</div>
					</DialogTitle>
					<DialogDescription className="mt-1 break-all text-xs">
						{typeof (selectedMod as ModItem)?.mod_file !==
						'undefined'
							? (selectedMod as ModItem)?.mod_file
							: selectedMod?.title}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<Label>Select Separator</Label>

					<div className="flex flex-col gap-2">
						<Input
							type="text"
							value={search}
							onChange={e => setSearch(e.target.value)}
							placeholder="Search separator..."
							className="w-full"
						/>

						<div className="relative">
							{filteredSeparators.length === 0 ? (
								<div className="p-2 text-center text-sm text-muted-foreground">
									No separator found.
								</div>
							) : (
								<div className="max-h-[200px] overflow-y-auto rounded-md border">
									{filteredSeparators.map(separator => (
										<div
											key={separator.identifier}
											className={`
                                                cursor-pointer px-3 py-2 hover:bg-secondary-bg
                                                ${
													selectedSeparator?.identifier ===
													separator.identifier
														? 'bg-secondary-bg'
														: ''
												}
                                            `}
											onClick={() =>
												setSelectedSeparator(separator)
											}
										>
											{separator.title}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				<Button
					className="w-full"
					type="button"
					variant="info"
					onClick={handleSend}
					disabled={!selectedSeparator}
				>
					Send
				</Button>
			</DialogContent>
		</Dialog>
	);
}

export default SendToSeparatorDialog;
