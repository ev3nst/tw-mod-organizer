import { packManagerStore } from '@/lib/store/pack-manager';

type VideoMetadata = {
	format: string;
	version: number;
	codec: string;
	width: number;
	height: number;
	frames: number;
	framerate: number;
};

export const PackVideoRenderer = () => {
	const selectedTreeItemData = packManagerStore(s => s.selectedTreeItemData);
	if (typeof selectedTreeItemData === 'undefined') return null;

	const metadata = selectedTreeItemData.content as VideoMetadata;
	return (
		<div className="flex size-full items-center justify-center">
			<div className="space-y-4 rounded-lg border p-6">
				<h2 className="mb-4 text-xl font-semibold">
					Video Information
				</h2>
				<div className="grid grid-cols-2 gap-x-8 gap-y-2">
					<div className="text-muted-foreground">Format:</div>
					<div>{metadata.format}</div>

					<div className="text-muted-foreground">Version:</div>
					<div>{metadata.version}</div>

					<div className="text-muted-foreground">Codec:</div>
					<div>{metadata.codec}</div>

					<div className="text-muted-foreground">Resolution:</div>
					<div>
						{metadata.width} &times; {metadata.height}
					</div>

					<div className="text-muted-foreground">Frames:</div>
					<div>{metadata.frames}</div>

					<div className="text-muted-foreground">Framerate:</div>
					<div>{metadata.framerate.toFixed(2)} FPS</div>
				</div>
			</div>
		</div>
	);
};
