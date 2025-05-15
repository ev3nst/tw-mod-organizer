import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';

import type { ModItem } from '@/lib/store/mods';
import { ModOrderItem } from '@/lib/store/mod_order';
import { ModActivationItem } from '@/lib/store/mod_activation';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
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
	mods,
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
			lr => lr.mod_file === (mod as ModItem).mod_file,
		);
	}

	const wouldAffectGameplay = (
		currentOrder: number,
		saveFileOrder: number,
	) => {
		if (!saveFileMod || !saveFileMod.is_active) return false;

		if (!modActivation?.is_active) return false;

		const minOrder = Math.min(currentOrder, saveFileOrder);
		const maxOrder = Math.max(currentOrder, saveFileOrder);

		if (Math.abs(currentOrder - saveFileOrder) === 1) {
			const adjacentPosition =
				currentOrder > saveFileOrder
					? currentOrder - 1
					: currentOrder + 1;

			const modAtAdjacentPosition = mods.find(m => {
				const order = modOrderData.find(
					mo => mo.mod_id === m.identifier,
				)?.order;
				return order === adjacentPosition;
			});

			if (modAtAdjacentPosition && !isSeparator(modAtAdjacentPosition)) {
				const adjacentActivation = modActivationData.find(
					ma => ma.mod_id === modAtAdjacentPosition.identifier,
				);

				return adjacentActivation && adjacentActivation.is_active;
			}
		}

		for (let i = minOrder + 1; i < maxOrder; i++) {
			const modAtPosition = mods.find(m => {
				const order = modOrderData.find(
					mo => mo.mod_id === m.identifier,
				)?.order;
				return order === i;
			});

			if (modAtPosition && !isSeparator(modAtPosition)) {
				const activation = modActivationData.find(
					ma => ma.mod_id === modAtPosition.identifier,
				);

				if (activation && activation.is_active) {
					return true;
				}
			}
		}

		return false;
	};

	const getStatusIconAndColor = () => {
		if (isModSeparator) {
			return <MinusIcon className="size-4" />;
		} else if (modActivation?.is_active) {
			if (!saveFileMod) {
				return <CheckIcon className="size-4 text-purple-500" />;
			} else if (saveFileMod.is_active) {
				return <CheckIcon className="size-4 text-green-500" />;
			} else {
				return <CheckIcon className="size-4 text-purple-500" />;
			}
		} else {
			if (saveFileMod?.is_active) {
				return <XIcon className="size-4 text-orange-500" />;
			} else {
				return <XIcon className="size-4 text-muted-foreground" />;
			}
		}
	};

	const getOrderColor = () => {
		if (isModSeparator) {
			return 'text-foreground font-bold';
		}

		if (modActivation?.is_active && saveFileMod && !saveFileMod.is_active) {
			return 'text-purple-500';
		}

		if (!saveFileMod) {
			return modActivation?.is_active
				? 'text-purple-500'
				: 'text-muted-foreground';
		}

		if (modOrder.order === saveFileMod.order_index) {
			return saveFileMod.is_active
				? 'text-green-500'
				: 'text-muted-foreground';
		}

		if (!saveFileMod.is_active) {
			return 'text-muted-foreground';
		}

		if (wouldAffectGameplay(modOrder.order, saveFileMod.order_index)) {
			return 'text-red-500';
		}

		return 'text-orange-500';
	};

	return (
		<li className="flex items-center gap-3 text-sm">
			{getStatusIconAndColor()}

			{saveFileMod && modOrder.order === saveFileMod.order_index ? (
				<div className={`italic ${getOrderColor()}`}>
					{modOrder.order}
				</div>
			) : (
				<div className="flex gap-1 italic">
					<div className={getOrderColor()}>{modOrder.order}</div>
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
