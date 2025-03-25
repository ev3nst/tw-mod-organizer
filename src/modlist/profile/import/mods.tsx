import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';

import type { ModItem } from '@/lib/store/mods';
import type { ModMetaItem } from '@/lib/store/mod_meta';

import { ModItemComponent } from './mod-item';

type ModsProps = {
	steamModExists: ModItem[];
	steamModDontExists: ModItem[];
	nexusModsExists: ModItem[];
	nexusModsDontExists: ModItem[];
	localModsExists: ModItem[];
	localModsDontExists: ModItem[];
	profileExportMods: ModItem[];
	modsOnly: ModItem[];
	modMetaData: ModMetaItem[];
};

export const Mods = ({
	steamModExists,
	steamModDontExists,
	nexusModsExists,
	nexusModsDontExists,
	localModsExists,
	localModsDontExists,
	profileExportMods,
	modsOnly,
	modMetaData,
}: ModsProps) => {
	return (
		<AccordionItem value="mods">
			<AccordionTrigger className="text-md">
				<div className="flex gap-2">
					<span>Mods</span>
					<span className="text-white">
						({steamModExists.length})
					</span>
					<span className="text-muted-foreground">
						({steamModDontExists.length})
					</span>
					<span className="text-blue-500">
						({nexusModsExists.length})
					</span>
					<span className="text-purple-500">
						({nexusModsDontExists.length})
					</span>
					<span className="text-orange-500">
						({localModsExists.length})
					</span>
					<span className="text-red-500">
						({localModsDontExists.length})
					</span>
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="flex flex-col gap-1">
					{profileExportMods
						.filter(m => m.item_type !== 'base_mod')
						.map(item => (
							<ModItemComponent
								modsOnly={modsOnly}
								modMetaData={modMetaData}
								key={`mod-${item.identifier}`}
								item={item}
							/>
						))}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
};
