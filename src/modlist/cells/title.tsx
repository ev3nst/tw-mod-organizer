import { TableCell } from '@/components/table';

import type { ModItemSeparatorUnion } from '@/lib/api';
import { settingStore } from '@/lib/store/setting';
import { modMetaStore } from '@/lib/store/mod_meta';
import { isSeparator } from '@/modlist/utils';

export const Title = ({ mod }: { mod: ModItemSeparatorUnion }) => {
	const { title, background_color, text_color } = mod;

	const metaData = modMetaStore(state => state.data);
	const selectedModMeta = metaData.find(md => md.mod_id === mod.identifier);

	if (isSeparator(mod)) {
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

		let titleTxt = title;
		if (
			typeof selectedModMeta !== 'undefined' &&
			typeof selectedModMeta.title !== 'undefined' &&
			selectedModMeta.title !== null &&
			selectedModMeta.title !== ''
		) {
			titleTxt = selectedModMeta.title;
		}

		return (
			<TableCell>
				<div className="flex items-center gap-2">
					{imgSrc && (
						<img
							className="rounded-full object-cover h-6 select-none"
							src={imgSrc}
						/>
					)}
					{titleTxt ?? ''}
				</div>
			</TableCell>
		);
	}
};

const calculateSeparatorColSpan = () => {
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	const toggle_creator = settingStore(state => state.toggle_creator);
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
	if (!toggle_creator) {
		separatorColSpan--;
	}
	return separatorColSpan;
};
