import { TableCell, TableFooter, TableRow } from '@/components/table';

import { settingStore } from '@/lib/store/setting';

export const Footer = ({ modCount }: { modCount: number }) => {
	const selectedGame = settingStore(state => state.selectedGame);
	const toggle_type = settingStore(state => state.toggle_type);
	const toggle_category = settingStore(state => state.toggle_category);
	const toggle_conflict = settingStore(state => state.toggle_conflict);
	const toggle_version = settingStore(state => state.toggle_version);
	const toggle_creator = settingStore(state => state.toggle_creator);
	const toggle_created_at = settingStore(state => state.toggle_created_at);

	let colSpan = 10;
	if (!toggle_type) colSpan--;
	if (!toggle_category) colSpan--;
	if (!toggle_conflict || selectedGame!.slug === 'mbbl') colSpan--;
	if (!toggle_version) colSpan--;
	if (!toggle_creator) colSpan--;
	if (!toggle_created_at) colSpan--;
	return (
		<TableFooter>
			<TableRow>
				<TableCell colSpan={colSpan}>Mod Count</TableCell>
				<TableCell className="text-center">{modCount}</TableCell>
			</TableRow>
		</TableFooter>
	);
};
