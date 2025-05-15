import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

import { NativeFileInput } from '@/components/native-file-input';
import { DialogFooter } from '@/components/dialog';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';
import { Checkbox } from '@/components/checkbox';
import { ScrollArea } from '@/components/scroll-area';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/card';

import { settingStore } from '@/lib/store/setting';
import { profileStore } from '@/lib/store/profile';
import { ProfileModel } from '@/lib/store/profile-model';
import { ModOrderModel } from '@/lib/store/mod_order';
import { ModActivationModel } from '@/lib/store/mod_activation';
import { ModMetaModel } from '@/lib/store/mod_meta';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';
import { ModItem, modsStore } from '@/lib/store/mods';
import { isSeparator } from '@/lib/store/mod_separator';
import { SubscriptionErrorDialog } from '@/nav/profile/import/subscribe-error';

export function ImportData() {
	const [loading, setLoading] = useState(false);
	const [configJSONPath, setConfigJSONPath] = useState('');
	const [configData, setConfigData] = useState<any>(null);
	const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
	const [subscribeToSteamMods, setSubscribeToSteamMods] = useState(true);
	const [modsToSubscribe, setModsToSubscribe] = useState<any[]>([]);
	const [showPreviewData, setShowPreviewData] = useState(false);

	const [subscriptionErrors, setSubscriptionErrors] = useState<
		Array<{
			title: string;
			id: string;
			error: string;
		}>
	>([]);
	const [showSubscriptionErrorDialog, setShowSubscriptionErrorDialog] =
		useState(false);
	const [pendingImportData, setPendingImportData] = useState<any>(null);

	const { selectedGame, games } = settingStore(
		useShallow(state => ({
			selectedGame: state.selectedGame,
			games: state.games,
		})),
	);

	const profiles = profileStore(state => state.profiles);
	const mods = modsStore(state => state.mods);

	const handleParseConfig = async () => {
		if (!configJSONPath) return;

		setLoading(true);
		try {
			const result = await api.import_data(
				selectedGame!.steam_id,
				configJSONPath,
			);

			setConfigData(result);

			const availableProfiles: string[] = [];
			const profileGameKeys = Object.keys(result.mod_profiles);
			for (let pi = 0; pi < profileGameKeys.length; pi++) {
				const gameKey = profileGameKeys[pi];
				const game = games.find(g => g.slug_opt === gameKey);
				if (!game) continue;

				result.mod_profiles[gameKey].forEach((profile: any) => {
					availableProfiles.push(
						`${gameKey}:${profile.profile_name}`,
					);
				});
			}

			setSelectedProfiles(availableProfiles);

			const onlySteamMods = mods.filter(
				m =>
					!isSeparator(m) && (m as ModItem).item_type === 'steam_mod',
			);

			let steamModsToSubscribe: any[] = [];
			for (let pi = 0; pi < profileGameKeys.length; pi++) {
				const gameKey = profileGameKeys[pi];
				const game = games.find(g => g.slug_opt === gameKey);
				if (!game) continue;

				const profileMods = result.mod_profiles[gameKey].flatMap(
					(profile: any) => profile.mods,
				);
				const newMods = profileMods.filter(
					(m: any) =>
						!Number.isNaN(Number(m.identifier)) &&
						!onlySteamMods.find(
							om => om.identifier === m.identifier,
						),
				);

				steamModsToSubscribe = [...steamModsToSubscribe, ...newMods];
			}

			steamModsToSubscribe = steamModsToSubscribe.filter(
				(mod, index, self) =>
					index ===
					self.findIndex(m => m.identifier === mod.identifier),
			);

			setModsToSubscribe(steamModsToSubscribe);
			setShowPreviewData(true);
		} catch (error) {
			toastError(error);
			setConfigData(null);
			setShowPreviewData(false);
		} finally {
			setLoading(false);
		}
	};

	const handleContinueWithErrors = async () => {
		setShowSubscriptionErrorDialog(false);

		if (pendingImportData) {
			await completeImport(pendingImportData);
			setPendingImportData(null);
		}
	};

	const handleAbortImport = () => {
		setShowSubscriptionErrorDialog(false);
		setLoading(false);
		setPendingImportData(null);
		toast.error('Import aborted due to subscription errors.');
	};

	const completeImport = async (parsedData: any) => {
		if (!parsedData) return;

		try {
			const { importedModMeta, importedProfiles } = parsedData;

			for (const metaData of importedModMeta) {
				const { game, metaItems } = metaData;

				let modMeta = await ModMetaModel.retrieve(
					undefined,
					game.steam_id,
				);
				if (!modMeta) {
					modMeta = new ModMetaModel({
						id: null as any,
						app_id: game.steam_id,
						data: [],
					});
					await modMeta.save();
				}

				if (modMeta.data === null) {
					modMeta.data = [];
				}

				for (let mti = 0; mti < metaItems.length; mti++) {
					const item = metaItems[mti];
					if (
						typeof item.categories !== 'undefined' &&
						item.categories !== null &&
						item.categories !== ''
					) {
						const findIndex = modMeta.data!.findIndex(
							m => m.mod_id === item.identifier,
						);
						if (findIndex !== -1) {
							modMeta.data[findIndex].categories =
								item.categories;
						} else {
							modMeta.data.push({
								mod_id: item.identifier,
								title: item.name,
								categories: item.categories,
								version: '',
							});
						}
					}
				}

				await modMeta.save();
			}

			for (const profileData of importedProfiles) {
				const { game, profileInfo } = profileData;

				let sanitizedProfileName = profileInfo.profile_name.trim();
				const findDuplicateName = profiles.find(
					p =>
						p.name === sanitizedProfileName &&
						p.app_id === game.steam_id,
				);

				if (findDuplicateName) {
					toast.warning(
						`Profile with name: ${sanitizedProfileName} already exists. Skipping...`,
					);
					continue;
				}

				const newProfile = new ProfileModel({
					id: undefined as any,
					name: sanitizedProfileName,
					app_id: game.steam_id,
					is_active: false,
				});
				await newProfile.save();

				const newModActivation = new ModActivationModel({
					id: undefined as any,
					profile_id: newProfile.id,
					app_id: game.steam_id,
					data: profileInfo.mods.map((pm: any) => {
						return {
							mod_id: pm.identifier,
							title: pm.title,
							is_active: pm.is_active,
						};
					}),
				});
				await newModActivation.save();

				const newModOrder = new ModOrderModel({
					id: undefined as any,
					profile_id: newProfile.id,
					app_id: game.steam_id,
					data: profileInfo.mods.map((pr: any, pri: number) => {
						return {
							mod_id: pr.identifier,
							title: pr.title,
							mod_file_path: pr.mod_file_path,
							order: pri + 1,
						};
					}),
				});
				await newModOrder.save();
			}

			toast.success('Import successful!');
			setTimeout(() => {
				window.location.reload();
			}, 500);
		} catch (error) {
			toastError(error);
		} finally {
			setLoading(false);
		}
	};

	async function handleSubmit() {
		if (!configData || selectedProfiles.length === 0) return;

		setLoading(true);
		setSubscriptionErrors([]);

		try {
			if (subscribeToSteamMods && modsToSubscribe.length > 0) {
				const errors: Array<{
					title: string;
					id: string;
					error: string;
				}> = [];

				for (const mod of modsToSubscribe) {
					try {
						await api.subscribe(
							selectedGame!.steam_id,
							Number(mod.identifier),
						);
					} catch (error) {
						console.log('Error subscribing to mod:', mod);
						const errorMessage =
							error instanceof Error
								? error.message
								: typeof error === 'string'
									? error
									: 'Unknown error';

						errors.push({
							title: mod.title || `Mod ID: ${mod.identifier}`,
							id: mod.identifier,
							error: errorMessage,
						});
					}
				}

				if (errors.length > 0) {
					setSubscriptionErrors(errors);
					setShowSubscriptionErrorDialog(true);

					const importData = prepareImportDataFromConfig();
					setPendingImportData(importData);
					return;
				}
			}

			const importData = prepareImportDataFromConfig();
			await completeImport(importData);
		} catch (error) {
			toastError(error);
		} finally {
			if (!showSubscriptionErrorDialog) {
				setLoading(false);
			}
		}
	}

	const prepareImportDataFromConfig = () => {
		if (!configData) return null;

		const importedModMeta: any[] = [];
		const importedProfiles: any[] = [];

		const metaGameKeys = Object.keys(configData.mod_meta_information);
		for (let mgki = 0; mgki < metaGameKeys.length; mgki++) {
			const gameKey = metaGameKeys[mgki];
			const game = games.find(g => g.slug_opt === gameKey);
			if (!game) continue;

			importedModMeta.push({
				game,
				metaItems: configData.mod_meta_information[gameKey],
			});
		}

		const profileGameKeys = Object.keys(configData.mod_profiles);
		for (let gki = 0; gki < profileGameKeys.length; gki++) {
			const gameKey = profileGameKeys[gki];
			const game = games.find(g => g.slug_opt === gameKey);
			if (!game) continue;

			for (
				let pgi = 0;
				pgi < configData.mod_profiles[gameKey].length;
				pgi++
			) {
				const profile = configData.mod_profiles[gameKey][pgi];
				const profileKey = `${gameKey}:${profile.profile_name}`;

				if (selectedProfiles.includes(profileKey)) {
					importedProfiles.push({
						game,
						profileInfo: profile,
					});
				}
			}
		}

		return { importedModMeta, importedProfiles };
	};

	const toggleProfileSelection = (profileKey: string) => {
		setSelectedProfiles(prev => {
			if (prev.includes(profileKey)) {
				return prev.filter(p => p !== profileKey);
			} else {
				return [...prev, profileKey];
			}
		});
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="mb-1 flex flex-col text-sm font-bold">
				Import Data From: WH3-Mod-Manager
			</div>
			<p className="text-sm text-orange-500">Highly Experimental</p>
			<p className="text-sm text-muted-foreground">
				This process will import profiles and load order setup in
				WH3-Mod-Manager by parsing config.json file.
			</p>
			<p className="text-sm text-muted-foreground">
				If you have any local mods installed they will be also processed
				to be compatible with this app's structure. While doing so
				process will copy the mod files into the defined mods path in
				the settings so make sure you have enough space in the disk,
				depending on how much local mods you have this might take some
				time.
			</p>

			{!showPreviewData ? (
				<>
					<NativeFileInput
						className="mt-3"
						dialogTitle="Select config.json"
						extensionFilter={['json']}
						onFileChange={file => {
							setConfigJSONPath(file.path);
							return true;
						}}
					/>

					<DialogFooter>
						<Button
							type="button"
							variant="info"
							className={
								loading || configJSONPath === ''
									? 'disabled'
									: ''
							}
							disabled={loading || configJSONPath === ''}
							onClick={handleParseConfig}
						>
							Preview Profiles
							{loading && <Loading />}
						</Button>
					</DialogFooter>
				</>
			) : (
				<>
					<Card className="mt-2">
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-base">
								Available Profiles
							</CardTitle>
							<CardDescription>
								Select the profiles you want to import:
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-[200px] pr-4">
								<div className="space-y-4">
									{Object.keys(configData.mod_profiles).map(
										gameKey => {
											const game = games.find(
												g => g.slug_opt === gameKey,
											);
											if (!game) return null;

											return (
												<div
													key={gameKey}
													className="space-y-2"
												>
													<h3 className="text-sm font-semibold">
														{game.name}
													</h3>
													{configData.mod_profiles[
														gameKey
													].map((profile: any) => {
														const profileKey = `${gameKey}:${profile.profile_name}`;
														return (
															<div
																key={profileKey}
																className="ml-4 flex items-center space-x-2"
															>
																<Checkbox
																	id={`profile-${profileKey}`}
																	checked={selectedProfiles.includes(
																		profileKey,
																	)}
																	onCheckedChange={() =>
																		toggleProfileSelection(
																			profileKey,
																		)
																	}
																/>
																<label
																	htmlFor={`profile-${profileKey}`}
																	className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
																>
																	{
																		profile.profile_name
																	}
																	<span className="ml-2 text-xs text-muted-foreground">
																		(
																		{
																			profile
																				.mods
																				.length
																		}{' '}
																		mods)
																	</span>
																</label>
															</div>
														);
													})}
												</div>
											);
										},
									)}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>

					{modsToSubscribe.length > 0 && (
						<div className="mt-2 flex items-start space-x-2">
							<Checkbox
								id="subscribe-steam-mods"
								checked={subscribeToSteamMods}
								onCheckedChange={() =>
									setSubscribeToSteamMods(
										!subscribeToSteamMods,
									)
								}
							/>
							<div className="grid gap-1.5 leading-none">
								<label
									htmlFor="subscribe-steam-mods"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Subscribe to Steam Mods (
									{modsToSubscribe.length})
								</label>
								<p className="text-xs text-muted-foreground">
									Enable to automatically subscribe to Steam
									Workshop mods that are referenced in the
									profiles but not currently in your system.
								</p>
							</div>
						</div>
					)}

					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="mods-to-subscribe">
							<AccordionTrigger>
								Steam Mods to Subscribe (
								{modsToSubscribe.length})
							</AccordionTrigger>
							<AccordionContent>
								<ScrollArea className="h-[150px]">
									<div className="space-y-2">
										{modsToSubscribe.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No new Steam mods to subscribe.
											</p>
										) : (
											modsToSubscribe.map((mod: any) => (
												<div
													key={mod.identifier}
													className="break-all text-sm"
												>
													{mod.title ||
														`Mod ID: ${mod.identifier}`}
												</div>
											))
										)}
									</div>
								</ScrollArea>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<DialogFooter className="flex justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setShowPreviewData(false);
								setConfigData(null);
							}}
						>
							Back
						</Button>
						<Button
							type="button"
							variant="success"
							className={
								loading || selectedProfiles.length === 0
									? 'disabled'
									: ''
							}
							disabled={loading || selectedProfiles.length === 0}
							onClick={handleSubmit}
						>
							Start Importing
							{loading && <Loading />}
						</Button>
					</DialogFooter>
				</>
			)}

			<SubscriptionErrorDialog
				open={showSubscriptionErrorDialog}
				onOpenChange={setShowSubscriptionErrorDialog}
				erroredMods={subscriptionErrors}
				onContinue={handleContinueWithErrors}
				onAbort={handleAbortImport}
			/>
		</div>
	);
}
