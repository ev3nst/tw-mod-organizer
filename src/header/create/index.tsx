import { ArchiveIcon } from 'lucide-react';

import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Button } from '@/components/button';

import { modsStore } from '@/lib/store/mods';
import { settingStore } from '@/lib/store/setting';

import { InstallMod } from './install-mod';
import { CreateSeparator } from './create-separator';

export const Create = () => {
	const isGameRunning = settingStore(state => state.isGameRunning);

	const installModItemOpen = modsStore(state => state.installModItemOpen);
	const setInstallModItemOpen = modsStore(
		state => state.setInstallModItemOpen,
	);

	return (
		<Dialog
			open={installModItemOpen}
			onOpenChange={isOpen => setInstallModItemOpen(isOpen)}
		>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					className={`clickable-content ${
						isGameRunning ? 'disabled' : ''
					}`}
					disabled={isGameRunning}
				>
					<ArchiveIcon />
					Create
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="mb-1">Create Mod Item</DialogTitle>
					<p className="text-muted-foreground text-sm">
						You may need to
						<span className="text-green-500 mx-1">refresh</span>
						after creation.
					</p>
				</DialogHeader>
				<Tabs defaultValue="mod">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="mod">Local Mod Archive</TabsTrigger>
						<TabsTrigger value="separator">
							Separator (Grouping)
						</TabsTrigger>
					</TabsList>
					<TabsContent value="mod">
						<InstallMod />
					</TabsContent>
					<TabsContent value="separator">
						<CreateSeparator />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
};
