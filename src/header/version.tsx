import { useEffect, useState } from 'react';
import { DownloadIcon } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Button } from '@/components/button';

import api from '@/lib/api';

export const Version = () => {
	const [newVersion, setNewVersion] = useState<string | null>(null);
	const [changeLog, setChangeLog] = useState<string | null>(null);

	const currentVersion = '0.7.1';
	const compareVersions = (current: string, latest: string) => {
		const currentParts = current.split('.').map(Number);
		const latestParts = latest.split('.').map(Number);

		for (
			let i = 0;
			i < Math.max(currentParts.length, latestParts.length);
			i++
		) {
			if ((latestParts[i] || 0) > (currentParts[i] || 0)) {
				return true;
			}
		}
		return false;
	};

	useEffect(() => {
		const fetchLatestVersion = async () => {
			try {
				const data = await api.app_version_check();
				if (compareVersions(currentVersion, data.version)) {
					setNewVersion(data.version);
					setChangeLog(data.changelog);
				}
			} catch (error) {
				console.error('Failed to fetch the latest version', error);
			}
		};

		fetchLatestVersion();
	}, []);

	if (!newVersion) {
		return (
			<div className="text-muted-foreground ms-3">v{currentVersion}</div>
		);
	}

	return (
		<>
			{newVersion && newVersion !== currentVersion ? (
				<Dialog>
					<DialogTrigger asChild>
						<Button variant="ghost" className="text-green-500">
							<DownloadIcon /> v{newVersion}
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>New Update</DialogTitle>
						</DialogHeader>
						<div className="flex flex-col gap-4">
							<p>
								New version {currentVersion} -&gt; {newVersion}{' '}
								is available. To download, you may visit the
								GitHub releases page.
							</p>
							<p
								className="text-blue-500 hover:cursor-pointer"
								onClick={() =>
									api.open_external_url(
										`https://github.com/ev3nst/tw-mod-organizer/releases`,
									)
								}
							>
								GitHub Releases
							</p>

							<div># Changelog</div>
							<div className="whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto text-sm">
								{changeLog}
							</div>
						</div>
					</DialogContent>
				</Dialog>
			) : (
				<div className="text-muted-foreground ms-3">
					v{currentVersion}
				</div>
			)}
		</>
	);
};
