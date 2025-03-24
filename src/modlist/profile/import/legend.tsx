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
					className="text-sky-500 m-0 flex-shrink"
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
								<span className="text-white w-[60px] inline-block">
									White
								</span>
								Steam mods that are present.
							</p>
							<p className="text-muted-foreground">
								<span className="text-muted-foreground w-[60px] inline-block">
									Gray
								</span>
								Steam mods that are not present.
							</p>

							<p className="text-muted-foreground">
								<span className="text-blue-500 w-[60px] inline-block">
									Blue
								</span>
								Nexus mods that are found in the system.
							</p>

							<p className="text-muted-foreground">
								<span className="text-purple-500 w-[60px] inline-block">
									Purple
								</span>
								Nexus mods that dont exists.
							</p>

							<p className="text-muted-foreground">
								<span className="text-orange-500 w-[60px] inline-block">
									Orange
								</span>
								Local mods that are found in the system.
							</p>

							<p className="text-muted-foreground">
								<span className="text-red-500 w-[60px] inline-block">
									Red
								</span>
								Local mods that dont exists.
							</p>

							<Separator />

							{localModsDontExists > 0 && (
								<p className="text-red-500 text-sm">
									There are some local mods that could not be
									found in your system, if you continue
									anyways they will be ignored.
								</p>
							)}
							<Separator />
							{nexusModsDontExists > 0 && (
								<p className="text-purple-500 text-sm">
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
