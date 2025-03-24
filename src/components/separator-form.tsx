import { useState } from 'react';
import { Compact as ColorPicker } from '@uiw/react-color';

import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

interface SeparatorFormProps {
	initialValues?: {
		title?: string;
		backgroundColor?: string;
		textColor?: string;
	};
	onSubmit: (values: {
		title: string;
		backgroundColor: string;
		textColor: string;
	}) => void;
	disabled?: boolean;
	isLoading?: boolean;
}

export const SeparatorForm = ({
	initialValues = {
		title: '',
		backgroundColor: '#262626',
		textColor: '#fefefe',
	},
	onSubmit,
	disabled = false,
	isLoading = false,
}: SeparatorFormProps) => {
	const [title, setTitle] = useState<string>(initialValues.title || '');
	const [backgroundColor, setBackgroundColor] = useState<string>(
		initialValues.backgroundColor ?? '#262626',
	);
	const [textColor, setTextColor] = useState<string>(
		initialValues.textColor ?? '#fefefe',
	);

	const handleSubmit = () => {
		onSubmit({
			title: title.trim(),
			backgroundColor,
			textColor,
		});
	};

	const isFormValid = () => {
		return (
			title.trim() !== '' && backgroundColor !== '' && textColor !== ''
		);
	};

	return (
		<div className="flex flex-col w-full gap-4">
			<div className="grid grid-cols-4 items-center gap-3 pt-3">
				<Label>Title</Label>
				<Input
					autoComplete="off"
					autoCorrect="off"
					className="col-span-3"
					placeholder="Provide title for this separator"
					value={title}
					onChange={e => setTitle(e.currentTarget.value)}
				/>
			</div>

			<div className="grid grid-cols-5 items-center gap-3">
				<Label className="col-span-2 flex flex-col gap-3">
					<span>Background Color</span>
					<em>{backgroundColor}</em>
				</Label>
				<div className="col-span-3">
					<ColorPicker
						className="!w-full flex-grow"
						color={backgroundColor}
						onChange={color => setBackgroundColor(color.hex)}
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
						color={textColor}
						onChange={color => setTextColor(color.hex)}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<div>Preview:</div>
				<div
					className="py-2 rounded-sm px-5 min-h-[40px]"
					style={{
						backgroundColor,
						color: textColor,
					}}
				>
					<em>{title.trim() || 'Preview Text'}</em>
				</div>
			</div>

			<div className="flex justify-end">
				<Button
					type="button"
					variant="info"
					disabled={!isFormValid() || disabled || isLoading}
					className={
						!isFormValid() || disabled || isLoading
							? 'disabled'
							: ''
					}
					onClick={handleSubmit}
				>
					Save
					{isLoading && <Loading />}
				</Button>
			</div>
		</div>
	);
};
