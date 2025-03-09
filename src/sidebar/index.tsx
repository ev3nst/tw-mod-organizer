import { useState } from 'react';

import { Sidebar, SidebarContent } from '@/components/sidebar';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';

import { Downloads } from './downloads';
import { Saves } from './saves';
import { Play } from './play';

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
							<AccordionTrigger className="text-base font-medium text-foreground px-3 py-2 sticky top-0 bg-background z-10">
								Saves
							</AccordionTrigger>
							<AccordionContent className="overflow-auto max-h-[calc(100vh-12rem)]">
								<Saves />
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="downloads">
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
