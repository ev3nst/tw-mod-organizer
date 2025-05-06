import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';
import { Checkbox } from '@/components/checkbox';

import type { ModItem } from '@/lib/store/mods';
import type { ModMetaItem } from '@/lib/store/mod_meta';

import { MetaItemComponent } from './meta-item';

type MetaProps = {
	copyMeta: boolean;
	setCopyMeta: any;
	profileModMeta: ModMetaItem[];
	profileExportMods: ModItem[];
};

export const Meta = ({
	copyMeta,
	setCopyMeta,
	profileModMeta,
	profileExportMods,
}: MetaProps) => {
	return (
		<AccordionItem value="meta-info">
			<AccordionTrigger className="text-md">
				Mod Meta Information
			</AccordionTrigger>
			<AccordionContent>
				<div className="mb-4 flex items-center space-x-2">
					<Checkbox
						id="import_profile_copy_meta"
						aria-label="Copy Meta Information"
						checked={copyMeta}
						onCheckedChange={checked => setCopyMeta(!!checked)}
					/>
					<label
						htmlFor="import_profile_copy_meta"
						className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						This is completely optional. Unless unchecked meta
						information will be copied as well.
					</label>
				</div>

				{profileModMeta.map(meta => (
					<MetaItemComponent
						key={`meta-${meta.mod_id}`}
						meta={meta}
						profileExportMods={profileExportMods}
					/>
				))}
			</AccordionContent>
		</AccordionItem>
	);
};
