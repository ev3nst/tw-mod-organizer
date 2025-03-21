import { useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { SeparatorForm } from '@/components/separator-form';

import { modSeparatorStore } from '@/lib/store/mod_separator';
import { modOrderStore } from '@/lib/store/mod_order';
import { settingStore } from '@/lib/store/setting';
import { toastError } from '@/lib/utils';

export const CreateSeparator = () => {
	const [isLoading, setIsLoading] = useState(false);

	const init_reload = settingStore(state => state.init_reload);
	const setInitReload = settingStore(state => state.setInitReload);

	const separators = modSeparatorStore(state => state.data);
	const setSeparators = modSeparatorStore(state => state.setData);
	const modOrderData = modOrderStore(state => state.data);

	const handleSubmit = (values: {
		title: string;
		backgroundColor: string;
		textColor: string;
	}) => {
		setIsLoading(true);
		try {
			const checkIfExists = separators.some(
				s => s.title === values.title,
			);
			if (checkIfExists) {
				toast.error('Separator with this name already exists.');
				return;
			}

			const newArr = [...separators];
			const uniqueId = uuidv4();
			newArr.push({
				identifier: `separator_${uniqueId}`,
				title: values.title,
				order: modOrderData.length,
				background_color: values.backgroundColor,
				text_color: values.textColor,
				collapsed: false,
			});
			setSeparators(newArr);
			toast.success('Separator added.');
			setInitReload(!init_reload);
		} catch (error) {
			toastError(error);
		} finally {
			setIsLoading(false);
		}
	};

	return <SeparatorForm onSubmit={handleSubmit} isLoading={isLoading} />;
};
