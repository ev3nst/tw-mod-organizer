import { CSSProperties } from 'react';
import { ExternalLinkIcon, XIcon } from 'lucide-react';

import api from '@/lib/api';
import type { ModItem } from '@/lib/store/mods';
import type { ModMetaItem } from '@/lib/store/mod_meta';

type ModItemProps = {
	modsOnly: ModItem[];
	modMetaData: ModMetaItem[];
	item: ModItem;
	onRemoveMod: (mod: ModItem) => void;
	style?: CSSProperties;
};

export const ModItemComponent = ({
	modsOnly,
	modMetaData,
	item,
	onRemoveMod,
	style,
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
			style={style}
			key={`import_profile_mitem_${item.identifier}`}
			className={`py-1 text-sm ${styleClasses}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1 overflow-hidden break-words">
					<div
						onClick={isSteamMod ? handleUrlOpen : undefined}
						className=""
					>
						{item.title}
					</div>
					{isNexusMod && downloadLink !== '' && (
						<ExternalLinkIcon
							className="size-4 hover:cursor-pointer hover:text-blue-500"
							onClick={() => {
								api.open_external_url(downloadLink);
							}}
						/>
					)}
				</div>
				{item.item_type !== 'base_mod' && (
					<XIcon
						className="size-4 text-red-500 hover:cursor-pointer"
						onClick={() => {
							onRemoveMod(item);
						}}
					/>
				)}
			</div>
			<em className="block text-xs text-muted-foreground">
				{item.mod_file}
			</em>
		</div>
	);
};
