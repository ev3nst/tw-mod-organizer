import { useState } from 'react';

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

import { Downloads } from './downloads';
import { Saves } from './saves';
import { Play } from './play';
import { Button } from '@/components/button';
import { InfoIcon } from 'lucide-react';

export function AppSidebar() {
	const [tab, setActiveTab] = useState<string>('saves');
	return (
		<Sidebar
			side="right"
			className="top-[--header-height] !h-[calc(100svh-var(--header-height))] bg-background flex flex-col"
		>
			<SidebarContent className="flex flex-col h-full scrollbar-hide">
				<div className="flex-grow overflow-visible flex flex-col">
					<Accordion
						type="single"
						collapsible
						defaultValue="saves"
						value={tab}
						onValueChange={setActiveTab}
						className="flex flex-col"
					>
						<AccordionItem value="saves">
							<div className="flex justify-between items-center">
								<AccordionTrigger className="text-base font-medium text-foreground px-3 py-2 sticky top-0 bg-background z-10 w-[300px]">
									Saves
								</AccordionTrigger>
								<Dialog>
									<DialogTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="text-blue-500 m-0 flex-shrink"
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
												<div className="!text-base pt-2">
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
													excempt from this process as
													there is no way to know
													which mods were active at
													that time.
												</div>
											</DialogDescription>
										</DialogHeader>
									</DialogContent>
								</Dialog>
							</div>
							<AccordionContent className="overflow-auto max-h-[calc(100vh-12rem)]">
								<Saves />
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="downloads" className="relative">
							<AccordionTrigger className="text-base font-medium text-foreground px-3 py-2 sticky top-0 bg-background z-10">
								Downloads
							</AccordionTrigger>
							<AccordionContent
								className="overflow-auto max-h-[calc(100vh-12rem)]"
								forceMount
								hidden={'downloads' !== tab}
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
