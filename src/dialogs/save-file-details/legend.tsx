import { CheckIcon, FileWarningIcon, MinusIcon, XIcon } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/dialog';
import { Button } from '@/components/button';
import { Separator } from '@/components/separator';

const LegendItem = ({
	color,
	label,
	description,
}: {
	color: string;
	label: string;
	description: string;
}) => (
	<div className="flex gap-4">
		<div className={`${color} w-[50px] shrink-0`}>{label}</div>
		<div>{description}</div>
	</div>
);

const LegendIconItem = ({
	icon,
	label,
}: {
	icon: JSX.Element;
	label: string;
}) => (
	<div className="flex items-center gap-4 text-foreground">
		{icon}
		<div>{label}</div>
	</div>
);

export const LegendDialog = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button variant="outline">How it works ?</Button>
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>How it works</DialogTitle>
				<DialogDescription asChild>
					<div className="!text-base">
						<div className="flex flex-col gap-1">
							<LegendItem
								color="text-green-500"
								label="Green"
								description="Present and required in save file."
							/>
							<LegendItem
								color="text-blue-500"
								label="Blue"
								description="What order should be."
							/>
							<LegendItem
								color="text-orange-500"
								label="Orange"
								description="Different than save file but not affecting gameplay."
							/>
							<LegendItem
								color="text-red-500"
								label="Red"
								description="Missing file or mismatched order."
							/>
							<LegendItem
								color="text-purple-500"
								label="Purple"
								description="Did not exist in save file or was not active before."
							/>
							<Separator className="my-2" />
							<LegendIconItem
								icon={<CheckIcon className="size-4" />}
								label="Mod is active"
							/>
							<LegendIconItem
								icon={<XIcon className="size-4" />}
								label="Mod is passive"
							/>
							<LegendIconItem
								icon={<FileWarningIcon className="size-4" />}
								label="File is missing."
							/>
							<LegendIconItem
								icon={<MinusIcon className="size-4" />}
								label="Separator (ignored for gameplay)"
							/>

							<Separator className="my-2" />

							<div className="mt-1 text-muted-foreground">
								<span className="me-1 text-foreground">
									Play
								</span>
								It will load the save with required mods and its
								order. If there are new active mods they will be
								pushed to bottom and also be loaded.
							</div>
						</div>
						<div className="mt-2 text-muted-foreground">
							<span className="me-1 text-foreground">
								Load Exactly
							</span>
							This action will load the save with required mods
							and its order, ignoring any new active mods.
						</div>
					</div>
				</DialogDescription>
			</DialogHeader>
		</DialogContent>
	</Dialog>
);
