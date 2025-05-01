import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';

import type { ModItem } from '@/lib/store/mods';
import type { ModMetaItem } from '@/lib/store/mod_meta';

import { ModItemComponent } from './mod-item';
import { FixedSizeList } from 'react-window';

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
	onRemoveMod: (mod: ModItem) => void;
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
	onRemoveMod,
}: ModsProps) => {
	const filteredMods = profileExportMods.filter(
		m => m.item_type !== 'base_mod',
	);
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
			<AccordionContent className="sm:max-w-[540px] p-0">
				<FixedSizeList
					height={200}
					width="100%"
					itemCount={filteredMods.length}
					itemSize={50}
					className="no-scrollbar"
				>
					{({ index, style }) => (
						<ModItemComponent
							style={style}
							modsOnly={modsOnly}
							modMetaData={modMetaData}
							item={filteredMods[index]}
							onRemoveMod={onRemoveMod}
						/>
					)}
				</FixedSizeList>
			</AccordionContent>
		</AccordionItem>
	);
};
