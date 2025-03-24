import type { ModMetaItem } from '@/lib/store/mod_meta';
import type { ModItem } from '@/lib/store/mods';

type MetaItemProps = {
	meta: ModMetaItem;
	profileExportMods: ModItem[];
};

export const MetaItemComponent = ({
	meta,
	profileExportMods,
}: MetaItemProps) => {
	if (meta.title === '' && meta.categories === '') {
		return null;
	}

	const modDetail = profileExportMods.find(
		pedm => pedm.identifier === meta.mod_id,
	);

	if (!modDetail) {
		return null;
	}

	return (
		<div
			className="flex flex-col gap-1 py-1"
			key={`import_profile_mod_meta_${meta.mod_id}`}
		>
			<div>{modDetail.title}</div>
			{meta.title && (
				<div className="text-muted-foreground">Title: {meta.title}</div>
			)}
			{meta.categories && (
				<div className="text-muted-foreground">
					Categories: {meta.categories}
				</div>
			)}
		</div>
	);
};
