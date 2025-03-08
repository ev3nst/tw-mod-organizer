import { TableCell, TableFooter, TableRow } from '@/components/table';

import { settingStore } from '@/lib/store/setting';

export const Footer = ({ length }: { length: number }) => {
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);

	let colSpan = 7;
	if (!toggle_category) colSpan--;
	if (!toggle_conflict) colSpan--;
	if (!toggle_version) colSpan--;
	return (
		<TableFooter>
			<TableRow>
				<TableCell colSpan={colSpan}>Mod Count</TableCell>
				<TableCell className="text-right">{length}</TableCell>
			</TableRow>
		</TableFooter>
	);
};
