import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
	const {
		modVersionData,
		setModVersionData,
		changedMods,
		setChangedMods,
		versionInfoOpen,
		toggleVersionInfo,
	} = modVersionStore(
		useShallow(state => ({
			modVersionData: state.data,
			setModVersionData: state.setData,
			changedMods: state.changedMods,
			setChangedMods: state.setChangedMods,
			versionInfoOpen: state.versionInfoOpen,
			toggleVersionInfo: state.toggleVersionInfo,
		})),
	);

	const changedSteamMods = useMemo(
		() => changedMods.filter(m => m.mod_type === 'steam_mod'),
		[changedMods],
	);

	const changedNexusMods = useMemo(
		() => changedMods.filter(m => m.mod_type === 'nexus_mod'),
		[changedMods],
	);

	const handleAcknowledge = (
		modId: string | number,
		version: string | number,
	) => {
		setModVersionData(
			modVersionData.map(mod =>
				mod.mod_id === String(modId)
					? { ...mod, latest_version: version, version }
					: mod,
			),
		);

		setChangedMods(changedMods.filter(mod => mod.mod_id !== modId));
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

	const ModSection = useMemo(
		() =>
			({
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
						<div className="grow">
							{title}
							<span className="ms-1 text-sm text-muted-foreground">
								{description}
							</span>
						</div>
					</div>

					<div className="mt-2 flex max-h-[150px] flex-col divide-y overflow-auto text-sm">
						{mods.map(mod => (
							<div
								key={`version_tracking_${mod.mod_id}`}
								className="flex cursor-pointer justify-between rounded-sm p-2 hover:bg-primary-foreground"
								onClick={() =>
									typeof mod.url === 'string' &&
									api.open_external_url(mod.url)
								}
							>
								<div>{mod.title}</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
									{mod.mod_type === 'steam_mod' ? (
										<>
											<span className="text-xs italic">
												{formatVersion(
													mod,
													mod.latest_version,
												)}
											</span>
											<span>-</span>
											<span className="text-xs italic text-green-500">
												{formatVersion(
													mod,
													mod.version,
												)}
											</span>
										</>
									) : (
										<>
											<span className="text-xs italic">
												{formatVersion(
													mod,
													mod.version,
												)}
											</span>
											<span>-</span>
											<span className="text-xs italic text-green-500">
												{formatVersion(
													mod,
													mod.latest_version,
												)}
											</span>
										</>
									)}

									{showAcknowledge && (
										<span
											className="text-green-500 transition-opacity hover:opacity-75"
											onClick={e => {
												e.stopPropagation();
												handleAcknowledge(
													mod.mod_id,
													mod.version,
												);
											}}
										>
											<CheckCircleIcon className="size-4" />
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			),
		[],
	);

	return (
		<Dialog open={versionInfoOpen} onOpenChange={toggleVersionInfo}>
			<DialogContent className="min-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<span>Mod Version Tracking</span>
					</DialogTitle>
					<DialogDescription className="mt-1 break-all text-xs">
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
