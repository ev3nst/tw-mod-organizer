import { SettingsIcon } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';

import { Settings } from './settings';
import { ImportData } from './import-data';

export function Preferences() {
	const isGameRunning = settingStore(state => state.isGameRunning);
	const shouldLockScreen = settingStore(state => state.shouldLockScreen);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					className={`clickable-content group/toggle h-8 w-8 px-0 ${
						isGameRunning || shouldLockScreen ? 'disabled' : ''
					}`}
					disabled={isGameRunning || shouldLockScreen}
				>
					<SettingsIcon />
					<span className="sr-only">Settings</span>
				</Button>
			</DialogTrigger>
			<DialogContent
				className="w-[500px]"
				onEscapeKeyDown={e => e.preventDefault()}
				onInteractOutside={e => e.preventDefault()}
			>
				{/* suppress radix error */}
				<DialogTitle className="hidden" />
				<Tabs defaultValue="settings">
					<TabsList className="grid grid-cols-2 mr-10 mb-3">
						<TabsTrigger value="settings">Settings</TabsTrigger>
						<TabsTrigger value="import_data">
							WH3 Mod Manager
						</TabsTrigger>
					</TabsList>
					<TabsContent value="settings">
						<Settings />
					</TabsContent>
					<TabsContent value="import_data">
						<ImportData />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
