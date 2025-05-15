import { useMemo } from 'react';
import { FileWarningIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Separator } from '@/components/separator';

import { modsStore } from '@/lib/store/mods';
import { modOrderStore } from '@/lib/store/mod_order';
import { modActivationStore } from '@/lib/store/mod_activation';
import { saveFilesStore } from '@/lib/store/save_files';

import { SaveFileModComponent } from './mod';
import { ReplaceProfileDialog } from './replace-profile';
import { LegendDialog } from './legend';
import { Play } from './play';
import { LoadExactly } from './load-exactly';

function SaveFileDetailsDialog() {
	const { saveFileDialogOpen, setSaveFileDialogOpen, selectedSaveFile } =
		saveFilesStore(
			useShallow(state => ({
				saveFileDialogOpen: state.saveFileDialogOpen,
				setSaveFileDialogOpen: state.setSaveFileDialogOpen,
				selectedSaveFile: state.selectedSaveFile,
			})),
		);

	const modActivationData = modActivationStore(state => state.data);
	const modOrderData = modOrderStore(state => state.data);
	const mods = modsStore(state => state.mods);

	const missingMods = useMemo(
		() =>
			selectedSaveFile
				? selectedSaveFile.load_order_data.filter(
						lr =>
							!mods.some(m => m.identifier === lr.identifier) &&
							lr.is_active === true &&
							lr.mod_file !== null, // Ignore separators
					)
				: [],
		[selectedSaveFile, mods],
	);

	return (
		<Dialog
			open={saveFileDialogOpen && typeof selectedSaveFile !== 'undefined'}
			onOpenChange={isOpen => setSaveFileDialogOpen(isOpen)}
		>
			<DialogContent className="min-w-[400px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Save File Details</div>
					</DialogTitle>
					<DialogDescription className="mt-1 break-all text-xs">
						{selectedSaveFile?.filename}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div>Loaded Mods:</div>
						<LegendDialog />
					</div>
					<div className="flex max-h-[250px] flex-col gap-1 overflow-y-auto text-sm">
						{selectedSaveFile?.load_order_data &&
							mods &&
							mods.map(mod => (
								<SaveFileModComponent
									key={`save_mods_${mod.identifier}`}
									mod={mod}
									mods={mods}
									modOrderData={modOrderData}
									modActivationData={modActivationData}
									saveFileLoadOrderData={
										selectedSaveFile.load_order_data
									}
								/>
							))}

						<Separator className="my-1" />
						{missingMods.map(mm => (
							<li
								className="flex items-center gap-3 text-sm"
								key={`missing_mods_${mm.identifier}`}
							>
								<FileWarningIcon className="size-4 text-red-500" />
								<div className="italic text-red-500">
									{mm.order_index}
								</div>
								<div className="text-muted-foreground">
									{mm.title}
								</div>
							</li>
						))}
					</div>
					<div className="flex w-full items-center justify-between">
						{missingMods?.length === 0 && <ReplaceProfileDialog />}
						<div className="flex gap-1">
							<Play />
							<LoadExactly />
						</div>
					</div>
					{missingMods?.length > 0 && (
						<div className="text-sm text-muted-foreground">
							This save cannot be opened using continue button
							because there are missing{' '}
							<FileWarningIcon className="me-1 inline size-4 align-text-bottom text-red-500" />
							<span>mods.</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default SaveFileDetailsDialog;
