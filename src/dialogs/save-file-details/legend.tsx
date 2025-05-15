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

const LegendIconItem = ({
	icon,
	label,
	description,
}: {
	icon: JSX.Element;
	label: string;
	description: string;
}) => (
	<div className="flex items-center gap-4">
		<div className="flex w-[30px] shrink-0 justify-center">{icon}</div>
		<div>
			<span className="font-medium">{label}</span>
			<span className="ml-2 text-muted-foreground">{description}</span>
		</div>
	</div>
);

const LegendColorItem = ({
	color,
	label,
	description,
}: {
	color: string;
	label: string;
	description: string;
}) => (
	<div className="flex items-center gap-4">
		<div className={`h-[20px] w-[30px] rounded ${color}`}></div>
		<div>
			<span className="font-medium">{label}</span>
			<span className="ml-2 text-muted-foreground">{description}</span>
		</div>
	</div>
);

export const LegendDialog = () => (
	<Dialog>
		<DialogTrigger asChild>
			<Button variant="outline">Legend</Button>
		</DialogTrigger>
		<DialogContent className="max-w-[500px]">
			<DialogHeader>
				<DialogTitle className="mb-3">Mod Status Legend</DialogTitle>
				<DialogDescription asChild>
					<div className="space-y-3">
						<div>
							<div className="space-y-2">
								<LegendIconItem
									icon={
										<CheckIcon className="size-4 text-green-500" />
									}
									label="Active"
									description="Mod is currently active and was active in save file"
								/>
								<LegendIconItem
									icon={
										<CheckIcon className="size-4 text-purple-500" />
									}
									label="Newly Active"
									description="Mod is active now but wasn't in save file"
								/>
								<LegendIconItem
									icon={
										<XIcon className="size-4 text-orange-500" />
									}
									label="Newly Inactive"
									description="Mod was active in save file but is now inactive"
								/>
								<LegendIconItem
									icon={
										<XIcon className="size-4 text-muted-foreground" />
									}
									label="Inactive"
									description="Mod is inactive and was inactive in save file"
								/>
								<LegendIconItem
									icon={<MinusIcon className="size-4" />}
									label="Separator"
									description="Ignored for gameplay"
								/>
								<LegendIconItem
									icon={
										<FileWarningIcon className="size-4 text-red-500" />
									}
									label="Missing"
									description="Required mod is missing from your system"
								/>
							</div>
						</div>

						<Separator />

						{/* Order Colors Section */}
						<div>
							<h3 className="mb-2 font-semibold">
								Load Order Colors
							</h3>
							<div className="space-y-2">
								<LegendColorItem
									color="bg-green-500"
									label="Matching"
									description="Order matches the save file"
								/>
								<LegendColorItem
									color="bg-blue-500"
									label="Original"
									description="The order in the save file"
								/>
								<LegendColorItem
									color="bg-orange-500"
									label="Harmless Change"
									description="Order changed but won't affect gameplay"
								/>
								<LegendColorItem
									color="bg-red-500"
									label="Gameplay Impact"
									description="Order changed and will affect gameplay"
								/>
								<LegendColorItem
									color="bg-purple-500"
									label="New Mod"
									description="Mod didn't exist in save file"
								/>
							</div>
						</div>

						<Separator />

						<div className="space-y-2">
							<h3 className="font-semibold">Play Options</h3>
							<div className="text-sm text-muted-foreground">
								<p className="mb-2">
									<span className="font-medium text-foreground">
										Play:
									</span>{' '}
									Load the save with required mods in their
									order. New active mods will be added at the
									bottom.
								</p>
								<p>
									<span className="font-medium text-foreground">
										Load Exactly:
									</span>{' '}
									Load the save with only the mods and order
									that existed in the save file.
								</p>
							</div>
						</div>
					</div>
				</DialogDescription>
			</DialogHeader>
		</DialogContent>
	</Dialog>
);
