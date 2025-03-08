import { TableCell } from '@/components/table';
import type { ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';

export const Title = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const { title, background_color, text_color } = mod;
	const item_type = 'item_type' in mod ? mod.item_type : 'separator';
	const isSeparator = item_type === 'separator';

	if (isSeparator) {
		const cellStyle = {
			backgroundColor: background_color,
			color: text_color,
		};

		const separatorColSpan = calculateSeparatorColSpan();
		return (
			<TableCell
				className="p-0 m-0 ps-5"
				colSpan={separatorColSpan}
				style={cellStyle}
			>
				{title}
			</TableCell>
		);
	} else {
		const preview_local =
			'preview_local' in mod ? mod.preview_local : undefined;
		const preview_url = 'preview_url' in mod ? mod.preview_url : undefined;
		const imgSrc = preview_local !== '' ? preview_local : preview_url;

		return (
			<TableCell>
				<div className="flex items-center gap-2">
					{imgSrc && (
						<img
							className="rounded-full object-cover h-6 select-none"
							src={imgSrc}
						/>
					)}
					{title}
				</div>
			</TableCell>
		);
	}
};

const calculateSeparatorColSpan = () => {
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	let separatorColSpan = 5;
	if (!toggle_category) {
		separatorColSpan--;
	}
	if (!toggle_conflict) {
		separatorColSpan--;
	}
	if (!toggle_version) {
		separatorColSpan--;
	}
	return separatorColSpan;
};
