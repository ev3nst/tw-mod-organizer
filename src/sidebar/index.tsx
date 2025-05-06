import { InfoIcon } from 'lucide-react';

import { Sidebar, SidebarContent } from '@/components/sidebar';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Button } from '@/components/button';

import { settingStore } from '@/lib/store/setting';

import { Downloads } from './downloads';
import { Saves } from './saves';
import { Play } from './play';

export function AppSidebar() {
	const sidebar_accordion = settingStore(state => state.sidebar_accordion);
	const setSidebarAccordion = settingStore(
		state => state.setSidebarAccordion,
	);

	return (
		<Sidebar
			side="right"
			className="top-[--header-height] flex !h-[calc(100svh-var(--header-height))] flex-col bg-background"
		>
			<SidebarContent className="scrollbar-hide flex h-full flex-col">
				<div className="flex grow flex-col overflow-visible">
					<Accordion
						type="single"
						collapsible
						defaultValue="saves"
						value={sidebar_accordion}
						onValueChange={setSidebarAccordion}
						className="flex flex-col"
					>
						<AccordionItem value="saves">
							<div className="flex items-center justify-between">
								<AccordionTrigger className="sticky top-0 z-10 w-[300px] bg-background px-3 py-2 text-base font-medium text-foreground">
									Saves
								</AccordionTrigger>
								<Dialog>
									<DialogTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="m-0 shrink text-blue-500"
											onClick={e => e.stopPropagation()}
										>
											<InfoIcon />
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>
												Save Game Mod Compatibility
											</DialogTitle>
											<DialogDescription asChild>
												<div className="pt-2 !text-base">
													Mod manager in the event of
													a save game file being
													created or modified while
													game is running, stores
													information for that save
													game. This information is
													later used if that save game
													is compatible with mods in
													your profile and informs you
													accordingly. If there is a
													save game file that is
													created while mod manager
													was not open they will be
													exempt from this process as
													there is no way to know
													which mods were active at
													that time.
												</div>
											</DialogDescription>
										</DialogHeader>
									</DialogContent>
								</Dialog>
							</div>
							<AccordionContent
								className="max-h-[calc(100vh-12rem)] overflow-auto"
								forceMount
								hidden={'saves' !== sidebar_accordion}
							>
								<Saves />
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="downloads" className="relative">
							<AccordionTrigger className="sticky top-0 z-10 bg-background px-3 py-2 text-base font-medium text-foreground">
								Downloads
							</AccordionTrigger>
							<AccordionContent
								className="max-h-[calc(100vh-12rem)] overflow-auto"
								forceMount
								hidden={'downloads' !== sidebar_accordion}
							>
								<Downloads />
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
				<Play />
			</SidebarContent>
		</Sidebar>
	);
}
