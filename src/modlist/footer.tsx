import { TableCell, TableFooter, TableRow } from '@/components/table';

import { settingStore } from '@/lib/store/setting';

export const Footer = ({ length }: { length: number }) => {
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	const toggle_creator = settingStore(state => state.toggle_creator);

	let colSpan = 8;
	if (!toggle_category) colSpan--;
	if (!toggle_conflict) colSpan--;
	if (!toggle_version) colSpan--;
	if (!toggle_creator) colSpan--;
	return (
		<TableFooter>
			<TableRow>
				<TableCell colSpan={colSpan}>Mod Count</TableCell>
				<TableCell className="text-center">{length}</TableCell>
			</TableRow>
		</TableFooter>
	);
};
