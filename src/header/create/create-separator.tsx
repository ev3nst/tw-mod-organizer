import { useState } from 'react';
import { Compact as ColorPicker } from '@uiw/react-color';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';

import { modSeparatorStore } from '@/lib/store/mod_separator';
import { modOrderStore } from '@/lib/store/mod_order';

export const CreateSeparator = () => {
	const [name, setName] = useState<string>('');
	const [bgColor, setBgColor] = useState<string>('#262626');
	const [textColor, setTextColor] = useState<string>('#fefefe');

	const separators = modSeparatorStore(state => state.data);
	const setSeparators = modSeparatorStore(state => state.setData);
	const modOrderData = modOrderStore(state => state.data);

	const handleSubmit = () => {
		const checkIfExists = separators.some(s => s.title === name);
		if (checkIfExists) {
			toast.error('Separator with this name already exists.');
			return;
		}

		const newArr = [...separators];
		const uniqueId = uuidv4();
		newArr.push({
			identifier: `separator_${uniqueId}`,
			title: name.trim(),
			order: modOrderData.length,
			background_color: bgColor,
			text_color: textColor,
			collapsed: false,
		});
		setSeparators(newArr);
		toast.success('Separator added.');
		setName('');
	};

	return (
		<div className="flex flex-col w-full gap-4">
			<div className="grid grid-cols-4 items-center gap-3 pt-3">
				<Label>Name</Label>
				<Input
					autoComplete="off"
					autoCorrect="off"
					className="col-span-3"
					placeholder="Provide name for this separator"
					value={name}
					onChange={e => setName(e.currentTarget.value)}
				/>
			</div>
			<div className="grid grid-cols-5 items-center gap-3">
				<Label className="col-span-2 flex flex-col gap-3">
					<span>Background Color</span>
					<em>{bgColor}</em>
				</Label>
				<div className="col-span-3">
					<ColorPicker
						className="!w-full flex-grow"
						onChange={color => setBgColor(color.hex)}
					/>
				</div>
			</div>
			<div className="grid grid-cols-5 items-center gap-3">
				<Label className="col-span-2 flex flex-col gap-3">
					<span>Text Color</span>
					<em>{textColor}</em>
				</Label>
				<div className="col-span-3">
					<ColorPicker
						className="!w-full flex-grow"
						onChange={color => setTextColor(color.hex)}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<div>Preview:</div>
				<div
					className="py-2 rounded-sm px-5 min-h-[40px]"
					style={{
						backgroundColor: bgColor,
						color: textColor,
					}}
				>
					<em>{name.trim()}</em>
				</div>
			</div>
			<div className="flex justify-end">
				<Button
					type="button"
					variant="info"
					className={
						name.trim() === '' || textColor === '' || bgColor === ''
							? 'disabled'
							: ''
					}
					disabled={
						name.trim() === '' || textColor === '' || bgColor === ''
					}
					onClick={handleSubmit}
				>
					Save changes
				</Button>
			</div>
		</div>
	);
};
