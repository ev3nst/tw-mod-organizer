import { useEffect, useState } from 'react';
import { Check, Moon, PaletteIcon, Repeat, Sun } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { Button } from '@/components/button';
import { Label } from '@/components/label';

import { AvailableThemeModes, availableThemes, cn } from '@/lib/utils';

export function ThemeCustomizer() {
	useEffect(() => {
		// Theme Mode
		const savedMode =
			localStorage.getItem('mode') || ('dark' as AvailableThemeModes);
		document.documentElement.classList.remove('light', 'dark');
		document.documentElement.classList.add(savedMode);
		localStorage.setItem('mode', savedMode);

		// Theme Customization
		const currentTheme = localStorage.getItem('theme') || 'theme-zinc';
		const borderRadius = localStorage.getItem('borderRadius') || '0.5rem';
		document.body.className = `theme-${currentTheme}`;
		document.body.style.setProperty('--radius', borderRadius);
		localStorage.setItem('theme', currentTheme);
		localStorage.setItem('borderRadius', borderRadius);
	}, []);

	return (
		<div className="flex items-center gap-2">
			<div className="hidden items-center md:flex">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							className="clickable-content group/toggle size-8 px-0"
						>
							<PaletteIcon />
							<span className="sr-only">Customize</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="z-40 w-[336px] bg-white p-6 dark:bg-background"
					>
						<CustomizerPopup />
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

function CustomizerPopup() {
	const [mode, setMode] = useState(() => {
		const savedMode = localStorage.getItem(
			'mode',
		) as AvailableThemeModes | null;
		return savedMode || 'light';
	});
	const [currentTheme, setTheme] = useState(
		() => localStorage.getItem('theme') || 'theme-zinc',
	);
	const [borderRadius, setBorderRadius] = useState(
		() => localStorage.getItem('borderRadius') || '0.5rem',
	);

	useEffect(() => {
		document.body.className = `theme-${currentTheme}`;
		document.body.style.setProperty('--radius', borderRadius);

		localStorage.setItem('theme', currentTheme);
		localStorage.setItem('borderRadius', borderRadius);
	}, [currentTheme, borderRadius]);

	useEffect(() => {
		document.documentElement.classList.remove('light', 'dark');
		document.documentElement.classList.add(mode);

		localStorage.setItem('mode', mode);
	}, [mode]);

	return (
		<div className="flex flex-col space-y-4 md:space-y-6">
			<div className="flex items-start pt-4 md:pt-0">
				<div className="space-y-1 pr-2">
					<div className="font-semibold leading-none tracking-tight">
						Theme Customizer
					</div>
					<div className="text-xs text-muted-foreground">
						Customize your components colors.
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="ml-auto rounded-[0.5rem]"
					onClick={() => {
						setMode('dark');
						setTheme('zinc');
						setBorderRadius('0.5rem');
					}}
				>
					<Repeat />
					<span className="sr-only">Reset</span>
				</Button>
			</div>
			<div className="flex flex-1 flex-col space-y-4 md:space-y-6">
				<div className="space-y-1.5">
					<Label className="text-xs">Color</Label>
					<div className="grid grid-cols-3 gap-2">
						{availableThemes.map(theme => {
							const isActive = currentTheme === theme.slug;

							return (
								<Button
									variant="outline"
									size="sm"
									key={theme.name}
									onClick={() => {
										setTheme(theme.slug);
									}}
									className={cn(
										'justify-start',
										isActive && 'border-2 border-primary',
									)}
									style={
										{
											'--theme-primary': `hsl(${
												theme.activeColor[
													mode as keyof typeof theme.activeColor
												]
											})`,
										} as React.CSSProperties
									}
								>
									<span
										className={cn(
											'mr-1 flex size-5 shrink-0 -translate-x-1 items-center justify-center rounded-full bg-[--theme-primary]',
										)}
									>
										{isActive && (
											<Check className="size-4 text-white" />
										)}
									</span>
									{theme.name}
								</Button>
							);
						})}
					</div>
				</div>
				<div className="space-y-1.5">
					<Label className="text-xs">Radius</Label>
					<div className="grid grid-cols-5 gap-2">
						{['0', '0.3', '0.5', '0.75', '1.0'].map(value => {
							return (
								<Button
									variant="outline"
									size="sm"
									key={value}
									onClick={() => {
										setBorderRadius(`${value}rem`);
									}}
									className={cn(
										borderRadius === `${value}rem` &&
											'border-2 border-primary',
									)}
								>
									{value}
								</Button>
							);
						})}
					</div>
				</div>
				<div className="space-y-1.5">
					<Label className="text-xs">Mode</Label>
					<div className="grid grid-cols-3 gap-2">
						{
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setMode('light')}
									className={cn(
										mode === 'light' &&
											'border-2 border-primary',
									)}
								>
									<Sun className="mr-1 -translate-x-1" />
									Light
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setMode('dark')}
									className={cn(
										mode === 'dark' &&
											'border-2 border-primary',
									)}
								>
									<Moon className="mr-1 -translate-x-1" />
									Dark
								</Button>
							</>
						}
					</div>
				</div>
			</div>
		</div>
	);
}
