import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { listen } from '@tauri-apps/api/event';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/alert-dialog';
import { Button } from '@/components/button';

import api from '@/lib/api';
import { SettingModel, settingStore } from '@/lib/store/setting';

export const Nexus = () => {
	const {
		isGameRunning,
		shouldLockScreen,
		setNexusAuthApi,
		setNexusAuthParams,
		nexus_api_key,
	} = settingStore(
		useShallow(state => ({
			isGameRunning: state.isGameRunning,
			shouldLockScreen: state.shouldLockScreen,
			setNexusAuthApi: state.setNexusAuthApi,
			setNexusAuthParams: state.setNexusAuthParams,
			nexus_api_key: state.nexus_api_key,
		})),
	);

	const nexus_connected = useMemo(
		() =>
			typeof nexus_api_key !== 'undefined' &&
			nexus_api_key !== null &&
			nexus_api_key !== '',
		[nexus_api_key],
	);

	useEffect(() => {
		const unlisten = listen<string>('nexus-connection', async event => {
			if (event.payload === 'connected') {
				const setting = await SettingModel.retrieve();
				if (
					setting.nexus_api_key !== null &&
					setting.nexus_auth_params !== null &&
					setting.nexus_auth_params.id !== null &&
					setting.nexus_auth_params.token !== null
				) {
					setNexusAuthApi(setting.nexus_api_key);
					setNexusAuthParams(setting.nexus_auth_params);
				}
			}
		});

		return () => {
			unlisten.then(f => f());
		};
	}, []);

	return nexus_connected ? (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					className={`clickable-content ${
						isGameRunning || shouldLockScreen ? 'disabled' : ''
					}`}
					disabled={isGameRunning || shouldLockScreen}
				>
					<img src="/nexus-logo.png" className="size-5" />
					Nexus
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Nexus Mods</AlertDialogTitle>
					<AlertDialogDescription>
						This process will delete nexus mods api related values
						and remove nexus download protocol registration.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-red-500 text-white hover:bg-red-700"
						onClick={async () => {
							await api.nxm_protocol_toggle(false);
							setNexusAuthApi(null);
							setNexusAuthParams({
								id: null,
								token: null,
							});
						}}
					>
						Erase
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	) : (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					className={`clickable-content ${
						isGameRunning || shouldLockScreen ? 'disabled' : ''
					}`}
					disabled={isGameRunning || shouldLockScreen}
				>
					<img
						src="/nexus-logo.png"
						className="size-5"
						style={{
							filter: 'grayscale(100%)',
						}}
					/>
					Nexus
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Nexus Mods</AlertDialogTitle>
					<AlertDialogDescription>
						This process will connect to nexus mods api and save api
						token with your confirmation from browser. It will also
						register download protocol of nexus mods so you will be
						able to click "Mod Manager Download" button in nexus
						mods and app will handle it.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-green-500 text-white hover:bg-green-700"
						onClick={async () => {
							await api.nxm_protocol_toggle(true);
							await api.nexus_auth_init();
						}}
					>
						Start
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
