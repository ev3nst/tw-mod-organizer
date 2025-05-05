import { useShallow } from 'zustand/react/shallow';
import { PlusIcon } from 'lucide-react';

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
import { ImportCollection } from './import-collection';
import { CreateSeparator } from './create-separator';

export const Create = () => {
	const { isGameRunning, shouldLockScreen } = settingStore(
		useShallow(state => ({
			isGameRunning: state.isGameRunning,
			shouldLockScreen: state.shouldLockScreen,
		})),
	);

	const { installModItemOpen, setInstallModItemOpen } = modsStore(
		useShallow(state => ({
			installModItemOpen: state.installModItemOpen,
			setInstallModItemOpen: state.setInstallModItemOpen,
		})),
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
						isGameRunning || shouldLockScreen ? 'disabled' : ''
					}`}
					disabled={isGameRunning || shouldLockScreen}
				>
					<PlusIcon />
					New
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[600px] flex flex-col gap-4">
				<DialogHeader>
					<DialogTitle className="mb-1">New Resource</DialogTitle>
					<p className="text-muted-foreground text-sm">
						You may need to
						<span className="text-green-500 mx-1">refresh</span>
						after process completes.
					</p>
				</DialogHeader>
				<Tabs defaultValue="mod">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="mod">Mod Archive</TabsTrigger>
						<TabsTrigger value="collection">
							Steam Collection
						</TabsTrigger>
						<TabsTrigger value="separator">
							Separator (Grouping)
						</TabsTrigger>
					</TabsList>
					<TabsContent
						value="mod"
						className="h-[380px] overflow-y-auto"
					>
						<InstallMod />
					</TabsContent>
					<TabsContent
						value="collection"
						className="h-[380px] overflow-y-auto"
					>
						<ImportCollection />
					</TabsContent>
					<TabsContent
						value="separator"
						className="h-[380px] overflow-y-auto"
					>
						<CreateSeparator />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
};
