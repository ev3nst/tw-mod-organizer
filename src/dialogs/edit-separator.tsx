import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { SeparatorForm } from '@/components/separator-form';

import { settingStore } from '@/lib/store/setting';
import { modSeparatorStore } from '@/lib/store/mod_separator';
import { toastError } from '@/lib/utils';

function EditSeparatorDialog() {
	const [isLoading, setIsLoading] = useState(false);

	const { init_reload, setInitReload } = settingStore(
		useShallow(state => ({
			init_reload: state.init_reload,
			setInitReload: state.setInitReload,
		})),
	);

	const {
		editSeparatorDialogOpen,
		selectedSeparator,
		toggleEditSeparator,
		separators,
		setSeparators,
	} = modSeparatorStore(
		useShallow(state => ({
			editSeparatorDialogOpen: state.editSeparatorDialogOpen,
			selectedSeparator: state.selectedSeparator,
			toggleEditSeparator: state.toggleEditSeparator,
			separators: state.data,
			setSeparators: state.setData,
		})),
	);

	if (!selectedSeparator) return null;

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

	const handleSubmit = (values: {
		title: string;
		backgroundColor: string;
		textColor: string;
	}) => {
		setIsLoading(true);
		try {
			setSeparators(
				separators.map(m => {
					if (m.identifier === selectedSeparator.identifier) {
						return {
							...m,
							title: values.title !== '' ? values.title : m.title,
							text_color:
								values.textColor !== ''
									? values.textColor
									: m.text_color,
							background_color:
								values.backgroundColor !== ''
									? values.backgroundColor
									: m.background_color,
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
		} finally {
			setIsLoading(false);
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
					<DialogDescription className="mt-1 break-all text-xs">
						{selectedSeparator.title}
					</DialogDescription>
				</DialogHeader>

				<SeparatorForm
					initialValues={{
						title: titlePlaceholder,
						backgroundColor:
							selectedSeparatorMeta?.background_color,
						textColor: selectedSeparatorMeta?.text_color,
					}}
					onSubmit={handleSubmit}
					isLoading={isLoading}
				/>
			</DialogContent>
		</Dialog>
	);
}

export default EditSeparatorDialog;
