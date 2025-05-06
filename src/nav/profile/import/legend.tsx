import { TriangleAlertIcon } from 'lucide-react';

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

type LegendProps = {
	localModsDontExists: number;
	nexusModsDontExists: number;
};

export const Legend = ({
	localModsDontExists,
	nexusModsDontExists,
}: LegendProps) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="m-0 shrink text-sky-500"
					onClick={e => e.stopPropagation()}
				>
					<TriangleAlertIcon />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Current Import State Information</DialogTitle>
					<DialogDescription asChild>
						<div className="flex flex-col gap-2 pt-4">
							<p className="text-muted-foreground">
								<span className="inline-block w-[60px] text-white">
									White
								</span>
								Steam mods that are present.
							</p>
							<p className="text-muted-foreground">
								<span className="inline-block w-[60px] text-muted-foreground">
									Gray
								</span>
								Steam mods that are not present.
							</p>

							<p className="text-muted-foreground">
								<span className="inline-block w-[60px] text-blue-500">
									Blue
								</span>
								Nexus mods that are found in the system.
							</p>

							<p className="text-muted-foreground">
								<span className="inline-block w-[60px] text-purple-500">
									Purple
								</span>
								Nexus mods that dont exists.
							</p>

							<p className="text-muted-foreground">
								<span className="inline-block w-[60px] text-orange-500">
									Orange
								</span>
								Local mods that are found in the system.
							</p>

							<p className="text-muted-foreground">
								<span className="inline-block w-[60px] text-red-500">
									Red
								</span>
								Local mods that dont exists.
							</p>

							<Separator />

							{localModsDontExists > 0 && (
								<p className="text-sm text-red-500">
									There are some local mods that could not be
									found in your system, if you continue
									anyways they will be ignored.
								</p>
							)}
							<Separator />
							{nexusModsDontExists > 0 && (
								<p className="text-sm text-purple-500">
									There are some nexus mods that could not be
									found in your system, you may view them in
									the list and install them manually
									afterwards import button should be enabled.
								</p>
							)}
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
};
