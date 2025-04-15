import { CheckCircleIcon } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Separator } from '@/components/separator';

import api from '@/lib/api';
import { modVersionStore } from '@/lib/store/mod_version';

const VersionTrackingDialog = () => {
	const changedMods = modVersionStore(state => state.changedMods);
	const setChangedMods = modVersionStore(state => state.setChangedMods);
	const versionInfoOpen = modVersionStore(state => state.versionInfoOpen);
	const toggleVersionInfo = modVersionStore(state => state.toggleVersionInfo);

	const changedSteamMods = changedMods.filter(
		m => m.mod_type === 'steam_mod',
	);
	const changedNexusMods = changedMods.filter(
		m => m.mod_type === 'nexus_mod',
	);

	const handleAcknowledge = (modId: string, version: string | number) => {
		setChangedMods(
			changedMods.map(mod =>
				mod.mod_id === modId
					? { ...mod, latest_version: version }
					: mod,
			),
		);
	};

	const formatVersion = (mod: any, version: string | number) => {
		if (mod.mod_type === 'steam_mod') {
			const date = new Date(Number(version));
			if (isNaN(date.getTime())) return version;
			return date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
		}
		return version;
	};

	const ModSection = ({
		title,
		logoSrc,
		description,
		mods,
		showAcknowledge = false,
	}: {
		title: string;
		logoSrc: string;
		description: string;
		mods: typeof changedMods;
		showAcknowledge?: boolean;
	}) => (
		<div>
			<div className="flex items-center gap-2">
				<img
					src={logoSrc}
					alt={`${title} Logo`}
					className="rounded-full object-cover"
					style={{ width: 20, height: 20 }}
				/>
				<div className="flex-grow">
					{title}
					<span className="ms-1 text-sm text-muted-foreground">
						{description}
					</span>
				</div>
			</div>

			<div className="flex flex-col max-h-[150px] overflow-auto text-sm divide-y mt-2">
				{mods.map(mod => (
					<div
						key={`version_tracking_${mod.mod_id}`}
						className="flex justify-between p-2 hover:bg-primary-foreground rounded-sm cursor-pointer"
						onClick={() =>
							typeof mod.url === 'string' &&
							api.open_external_url(mod.url)
						}
					>
						<div>{mod.title}</div>

						<div className="flex items-center gap-1">
							<span className="text-xs italic">
								{formatVersion(mod, mod.version)}
							</span>
							<span>-</span>
							<span className="text-xs italic text-green-500">
								{formatVersion(mod, mod.latest_version)}
							</span>

							{showAcknowledge && (
								<span
									className="text-green-500 hover:opacity-75 transition-opacity"
									onClick={e => {
										e.stopPropagation(); // prevent parent click
										handleAcknowledge(
											mod.mod_id,
											mod.version,
										);
									}}
								>
									<CheckCircleIcon className="w-4 h-4" />
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);

	return (
		<Dialog open={versionInfoOpen} onOpenChange={toggleVersionInfo}>
			<DialogContent className="min-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<span>Mod Version Tracking</span>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all">
						Mod version tracking summary.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{changedSteamMods.length > 0 && (
						<ModSection
							title="Steam Mods"
							logoSrc="/steam-logo.png"
							description=" - Automatically updated by Steam client. You can acknowledge these changes with the provided button."
							mods={changedSteamMods}
							showAcknowledge
						/>
					)}

					{changedSteamMods.length > 0 &&
						changedNexusMods.length > 0 && (
							<Separator className="mb-3" />
						)}

					{changedNexusMods.length > 0 && (
						<ModSection
							title="Nexus Mods"
							logoSrc="/nexus-logo.png"
							description=" - Each mod is individually checked when its last checked time exceeds one week, to inform you about available updates."
							mods={changedNexusMods}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default VersionTrackingDialog;
