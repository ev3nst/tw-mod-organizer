import { ExternalLinkIcon } from 'lucide-react';

import api from '@/lib/api';
import type { ModItem } from '@/lib/store/mods';
import type { ModMetaItem } from '@/lib/store/mod_meta';

type ModItemProps = {
	modsOnly: ModItem[];
	modMetaData: ModMetaItem[];
	item: ModItem;
};

export const ModItemComponent = ({
	modsOnly,
	modMetaData,
	item,
}: ModItemProps) => {
	const modExists =
		modsOnly.some(m => m.mod_file === item.mod_file) ||
		((item.item_type === 'nexus_mod' || item.item_type === 'local_mod') &&
			modMetaData.some(me => me.title === item.mod_file));
	const isSteamMod = item.item_type === 'steam_mod';
	const isLocalMod = item.item_type === 'local_mod';
	const isNexusMod = item.item_type === 'nexus_mod';

	let styleClasses = '';
	switch (item.item_type) {
		case 'local_mod':
			styleClasses = modExists ? 'text-orange-500' : 'text-red-500';
			break;
		case 'nexus_mod':
			styleClasses = modExists ? 'text-blue-500' : 'text-purple-500';
			break;
		case 'steam_mod':
			styleClasses = modExists
				? 'text-white hover:text-blue-500 hover:cursor-pointer'
				: 'text-muted-foreground hover:text-blue-500 hover:cursor-pointer';
			break;

		default:
			break;
	}

	const handleUrlOpen = () => {
		if (isLocalMod) return;
		api.open_external_url(
			`steam://openurl/https://steamcommunity.com/sharedfiles/filedetails/?id=${item.identifier}`,
		);
	};

	let downloadLink: string = '';
	if (typeof item.download_url === 'string' && item.download_url.length > 0) {
		downloadLink = item.download_url;
	} else if (typeof item.url === 'string' && item.url.length > 0) {
		downloadLink = item.url;
	}

	return (
		<div
			key={`import_profile_mitem_${item.identifier}`}
			className={`text-sm py-1 ${styleClasses}`}
		>
			<div className="flex items-center gap-1">
				<div onClick={isSteamMod ? handleUrlOpen : undefined}>
					{item.title}
				</div>
				{isNexusMod && downloadLink !== '' && (
					<ExternalLinkIcon
						className="w-4 h-4 hover:text-blue-500 hover:cursor-pointer"
						onClick={() => {
							api.open_external_url(downloadLink);
						}}
					/>
				)}
			</div>
			<em className="block text-muted-foreground text-xs">
				{item.mod_file}
			</em>
		</div>
	);
};
