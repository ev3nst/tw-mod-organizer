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

				<SeparatorForm
					initialValues={{
						title: titlePlaceholder,
						backgroundColor:
							selectedSeparatorMeta?.background_color,
						textColor: selectedSeparatorMeta?.text_color,
					}}
					submitLabel="Save"
					onSubmit={handleSubmit}
				/>
			</DialogContent>
		</Dialog>
	);
}

export default EditSeparatorDialog;
