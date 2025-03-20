import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';

import { ModItem, ModItemSeparatorUnion } from '@/lib/api';
import { ModOrderItem } from '@/lib/store/mod_order';
import { ModActivationItem } from '@/lib/store/mod_activation';
import { isSeparator } from '@/lib/store/mod_separator';
import { SaveFileLoadOrderData } from '@/lib/store/save_files';

type SaveFileModComponentProps = {
	mod: ModItemSeparatorUnion;
	mods: ModItemSeparatorUnion[];
	modOrderData: ModOrderItem[];
	modActivationData: ModActivationItem[];
	saveFileLoadOrderData: SaveFileLoadOrderData[];
};

export const SaveFileModComponent = ({
	mod,
	modOrderData,
	modActivationData,
	saveFileLoadOrderData,
}: SaveFileModComponentProps) => {
	const modOrder = modOrderData.find(
		mr => mr.mod_id === mod.identifier,
	) as ModOrderItem;
	const modActivation = modActivationData.find(
		ma => ma.mod_id === mod.identifier,
	);

	let saveFileMod = null;
	let isModSeparator = isSeparator(mod);
	if (!isModSeparator) {
		saveFileMod = saveFileLoadOrderData.find(
			lr => lr.pack_file === (mod as ModItem).pack_file,
		);
	}

	return (
		<li className="flex gap-3 items-center text-sm">
			{isModSeparator ? (
				<MinusIcon className="w-4 h-4" />
			) : (
				<>
					{modActivation!.is_active ? (
						<CheckIcon
							className={`w-4 h-4 ${
								saveFileMod && saveFileMod.is_active
									? 'text-green-500'
									: 'text-purple-600'
							}`}
						/>
					) : (
						<XIcon
							className={`w-4 h-4 ${
								saveFileMod && saveFileMod.is_active
									? 'text-red-500'
									: 'text-purple-600'
							}`}
						/>
					)}
				</>
			)}

			{saveFileMod && modOrder.order === saveFileMod.order_index ? (
				<div
					className={`italic ${
						!isModSeparator && saveFileMod.is_active
							? 'text-green-500'
							: 'text-purple-600'
					}`}
				>
					{modOrder.order}
				</div>
			) : (
				<div className="flex gap-1 italic">
					<div
						className={`
							${isModSeparator ? 'font-bold !text-white' : ''}
							
							${
								saveFileMod && saveFileMod.is_active === false
									? 'text-purple-600'
									: saveFileMod &&
										  saveFileMod.order_index + 1 ===
												modOrder.order
										? 'text-orange-500'
										: 'text-red-500'
							}`}
					>
						{modOrder.order}
					</div>
					{saveFileMod && saveFileMod.is_active && (
						<div className="text-blue-500">
							{saveFileMod.order_index}
						</div>
					)}
				</div>
			)}

			<div
				className={`${
					isModSeparator ? 'font-bold' : 'text-muted-foreground'
				}`}
			>
				{mod.title}
			</div>
		</li>
	);
};
