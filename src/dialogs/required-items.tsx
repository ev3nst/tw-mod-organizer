import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckIcon, XIcon } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/dialog';
import { Button } from '@/components/button';

import { modsStore, type ModItem } from '@/lib/store/mods';
import {
	buildModLookup,
	getCascadingDependencies,
	modActivationStore,
} from '@/lib/store/mod_activation';
import { Separator } from '@/components/separator';

const DependencyModComponent = ({
	dependencyMod,
	isActive,
}: {
	dependencyMod: ModItem;
	isActive: boolean;
}) => {
	return (
		<li
			className="flex gap-3 items-center text-sm"
			key={`required_items_dialog_${dependencyMod.identifier}`}
		>
			{isActive ? (
				<CheckIcon className="w-4 h-4 text-green-500" />
			) : (
				<XIcon className="w-4 h-4 text-red-500" />
			)}
			<div>{dependencyMod.title}</div>
		</li>
	);
};

function RequiredItemsDialog() {
	const mods = modsStore(state => state.mods);

	const {
		modActivationData,
		setModActivation,
		requiredItemsModal,
		setRequiredItemsModal,
		setRequiredItemsMod,
		requiredItemsMod,
	} = modActivationStore(
		useShallow(state => ({
			modActivationData: state.data,
			setModActivation: state.setData,
			requiredItemsModal: state.requiredItemsModal,
			setRequiredItemsModal: state.setRequiredItemsModal,
			setRequiredItemsMod: state.setRequiredItemsMod,
			requiredItemsMod: state.requiredItemsMod,
		})),
	);

	if (!requiredItemsMod) return null;

	const { modLookup, nonSeparatorMods } = useMemo(
		() => buildModLookup(mods),
		[mods],
	);
	const activatedMods = useMemo(
		() =>
			new Set(
				modActivationData
					.filter(ma => ma.is_active)
					.map(ma => ma.mod_id),
			),
		[modActivationData],
	);

	const isActive = activatedMods.has(requiredItemsMod.identifier);
	const dependencyMods = useMemo(
		() =>
			getCascadingDependencies(
				requiredItemsMod,
				modLookup,
				nonSeparatorMods,
				isActive ? 'dependencies' : 'dependents',
			),
		[requiredItemsMod, modLookup, nonSeparatorMods, isActive],
	);

	const closeModal = () => {
		setRequiredItemsModal(false);
		setRequiredItemsMod(undefined);
	};

	const handleActivationChange = (activate: boolean) => {
		const updatedModActivation = modActivationData.map(item => {
			const isDependency = dependencyMods.some(
				dm => dm.identifier === item.mod_id,
			);
			return isDependency ? { ...item, is_active: activate } : item;
		});
		setModActivation(updatedModActivation);
		closeModal();
	};

	const handleEnable = () => handleActivationChange(true);
	const handleDisable = () => handleActivationChange(false);

	return (
		<Dialog
			open={requiredItemsModal && requiredItemsMod !== undefined}
			onOpenChange={open => {
				if (!open) closeModal();
			}}
		>
			<DialogContent
				className="min-w-[400px] gap-3"
				onEscapeKeyDown={e => e.preventDefault()}
				onInteractOutside={e => e.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle className="flex items-baseline gap-3">
						<div>Mod Dependency</div>
					</DialogTitle>
					<DialogDescription className="text-xs mt-1 break-all">
						{requiredItemsMod.title}
					</DialogDescription>
				</DialogHeader>

				{isActive ? (
					<div>
						<div>Required Mods:</div>
						<Separator className="my-2" />
						<ul>
							{dependencyMods.map(dm => (
								<DependencyModComponent
									key={`required_items_dialog_${dm.identifier}`}
									dependencyMod={dm}
									isActive={activatedMods.has(dm.identifier)}
								/>
							))}
						</ul>
						<Separator className="my-2" />
						<div className="flex gap-2 items-center">
							<Button
								size="sm"
								variant="success"
								onClick={handleEnable}
							>
								Enable
							</Button>
							<p className="text-sm">
								These mods are required for{' '}
								<span className="text-blue-500 mx-1">
									{requiredItemsMod.title}
								</span>{' '}
								to work. Would you like to enable them as well?
							</p>
						</div>
					</div>
				) : (
					<div>
						<div>Mods that depend on this mod:</div>
						<Separator className="my-2" />
						<ul className="max-h-[220px] overflow-y-auto">
							{dependencyMods.map(dm => (
								<DependencyModComponent
									key={`required_items_dialog_${dm.identifier}`}
									dependencyMod={dm}
									isActive={activatedMods.has(dm.identifier)}
								/>
							))}
						</ul>
						<Separator className="my-2" />
						<div className="flex gap-2 items-center">
							<Button
								size="sm"
								variant="destructive"
								onClick={handleDisable}
							>
								Disable
							</Button>
							<p className="text-sm">
								These mods depend on{' '}
								<span className="text-blue-500 mx-1">
									{requiredItemsMod.title}
								</span>
								, which you just disabled. Would you like to
								disable them as well?
							</p>
						</div>
					</div>
				)}
				<em className="text-sm text-muted-foreground">
					If you want this to occur automatically without asking for
					your confirmation, you can disable the related option in
					settings.
				</em>
			</DialogContent>
		</Dialog>
	);
}

export default RequiredItemsDialog;
