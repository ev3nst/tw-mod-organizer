import { PlusIcon } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';

import { AddProfile } from './add-profile';
import { ImportProfile } from './import';
import { ExportProfile } from './export';

export const ProfileDialog = () => {
	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="w-7 h-7">
					<PlusIcon />
				</Button>
			</DialogTrigger>
			<DialogContent
				className="sm:max-w-[600px]"
				onEscapeKeyDown={e => e.preventDefault()}
				onInteractOutside={e => e.preventDefault()}
			>
				{/* suppress radix error */}
				<DialogTitle className="hidden" />
				<Tabs defaultValue="add_profile">
					<TabsList className="grid grid-cols-3 mr-10 mb-3">
						<TabsTrigger
							value="add_profile"
							disabled={isGameRunning || shouldLockScreen}
						>
							Add Profile
						</TabsTrigger>
						<TabsTrigger
							value="import_profile"
							disabled={isGameRunning || shouldLockScreen}
						>
							Import
						</TabsTrigger>
						<TabsTrigger
							value="export_profile"
							disabled={isGameRunning || shouldLockScreen}
						>
							Export
						</TabsTrigger>
					</TabsList>
					<TabsContent value="add_profile">
						<AddProfile />
					</TabsContent>
					<TabsContent value="import_profile">
						<ImportProfile />
					</TabsContent>
					<TabsContent value="export_profile">
						<ExportProfile />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
};
