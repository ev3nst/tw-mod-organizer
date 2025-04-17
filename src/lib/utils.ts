import { cva } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { convertFileSrc } from '@tauri-apps/api/core';

import type { FileMeta } from '@/components/native-file-input';

import api from '@/lib/api';
import type { ModItem } from '@/lib/store/mods';
import type { ModOrderItem } from '@/lib/store/mod_order';
import {
	isSeparator,
	type ModItemSeparatorUnion,
} from '@/lib/store/mod_separator';
import type { ModActivationItem } from '@/lib/store/mod_activation';
import { type SaveFile } from '@/lib/store/save_files';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

let timeout: NodeJS.Timeout;
export const debounceCallback = (cb: () => Promise<void>, timeoutMs = 100) => {
	clearTimeout(timeout);
	timeout = setTimeout(() => {
		cb().catch(e => toastError(e));
	}, timeoutMs);
};

export function toastError(error: any) {
	try {
		toast.error(String(error));
	} catch (_e) {}
	console.error(error);
}

export function normalizeOrder(array: ModOrderItem[]) {
	return array
		.sort((a, b) => a.order - b.order)
		.map((item, index) => ({ ...item, order: index + 1 }));
}

export const formatFileSize = (sizeInBytes: number): string => {
	if (sizeInBytes === 0) return '0 Bytes';

	const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const sizeIndex = Math.floor(Math.log(sizeInBytes) / Math.log(1024));

	const size = (sizeInBytes / Math.pow(1024, sizeIndex)).toFixed(2);
	return `${size} ${units[sizeIndex]}`;
};

export function isEmptyString(str?: string): boolean {
	return typeof str === 'undefined' || str === null || str === '';
}

export function cleanFileName(filename: string) {
	let name = filename.replace(/\.[^.]+$/, '');
	name = name.replace(/-((\d+-)+\d+)$/, '');
	name = name.replace(/(\d+(?:\.\d+)+)\.x$/, '$1');
	name = name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
	return name.endsWith('.') ? name.slice(0, -1) : name;
}

export async function getFileDetailsFromPath(path: string): Promise<FileMeta> {
	const name = path.split('\\').pop() as string;
	const url = convertFileSrc(path);
	const response = await fetch(url, { method: 'HEAD' });
	const fileSize = response.headers.get('Content-Length') as string;
	const mime = response.headers.get('Content-Type') as string;

	const fileDetails: FileMeta = {
		path,
		name,
		size: parseInt(fileSize, 10),
		mime,
	};

	if (mime?.startsWith('image/')) {
		fileDetails.preview = url;
		await new Promise<void>((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				fileDetails.width = img.width;
				fileDetails.height = img.height;
				resolve();
			};
			img.onerror = reject;
			img.src = url;
		});
	}

	return fileDetails;
}

export function determineErrorMessage(error: unknown) {
	let errorMessage = 'An unknown error occurred';
	if (error instanceof Error) {
		errorMessage = error.message;
	} else if (typeof error === 'string') {
		errorMessage = error;
	} else if (error && typeof error === 'object') {
		errorMessage = JSON.stringify(error);
	}

	return errorMessage;
}

export async function startGameTotalwar(
	app_id: number,
	mods: ModItemSeparatorUnion[],
	modActivationData: ModActivationItem[],
	saveFile?: SaveFile
) {
	const reverseLoadOrder = [...mods].slice().reverse();
	let addDirectoryTxt = '';
	let usedModsTxt = '';
	for (let ri = 0; ri < reverseLoadOrder.length; ri++) {
		if (isSeparator(reverseLoadOrder[ri])) continue;

		const mod = reverseLoadOrder[ri] as ModItem;
		const isActive = modActivationData.some(
			a => a.is_active === true && a.mod_id === mod.identifier
		);
		if (!isActive) continue;

		const cleanedModPath = mod.mod_file_path.replace(/\\/g, '/');
		const modFileName = cleanedModPath.split('/').pop();
		const modFolder = cleanedModPath.replace('/' + modFileName, '');
		addDirectoryTxt += `add_working_directory "${modFolder}";\n`;
		usedModsTxt += `mod "${modFileName}";\n`;
	}

	let save_game: string | undefined = '';
	if (
		typeof saveFile?.path !== 'undefined' &&
		saveFile?.path !== null &&
		saveFile?.path !== '' &&
		saveFile?.path.includes('\\')
	) {
		save_game = saveFile.path.split('\\').pop();
	}

	await api.start_game_totalwar(
		app_id,
		addDirectoryTxt,
		usedModsTxt,
		save_game
	);
}

export async function startGameBannerlord(
	app_id: number,
	mods: ModItemSeparatorUnion[],
	modActivationData: ModActivationItem[],
	_saveFile?: SaveFile
): Promise<string> {
	const modsToLoad = mods
		.filter(
			m =>
				!isSeparator(m) &&
				!modActivationData.some(
					ma =>
						ma.mod_id === m.identifier &&
						!ma.is_active &&
						(m as ModItem).item_type !== 'base_mod' &&
						m.identifier !== 'BirthAndDeath'
				)
		)
		.map(m => {
			const currentMod = m as ModItem;
			if (
				currentMod.item_type === 'steam_mod' ||
				currentMod.item_type === 'base_mod'
			) {
				return {
					identifier: currentMod.identifier,
					bannerlord_id: currentMod.game_specific_id,
					mod_path: currentMod.game_specific_id,
				};
			} else {
				return {
					identifier: currentMod.identifier,
					bannerlord_id: currentMod.game_specific_id,
					mod_path: currentMod.mod_file_path,
				};
			}
		});

	const command = await api.start_game_bannerlord(app_id, modsToLoad);
	return command;
}

export function normalizeTimestamp(timestamp: number): number {
	return timestamp < 1_262_304_000_000 // Jan 1, 2010 in milliseconds
		? timestamp * 1000
		: timestamp;
}

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground shadow hover:bg-primary/90',
				'default-outline':
					'border border-input bg-background shadow hover:bg-accent hover:text-accent-foreground',
				success: 'bg-green-700 text-white shadow hover:bg-green-600',
				info: 'bg-blue-700 text-white shadow hover:bg-blue-600',
				'success-outline':
					'border border-green-500 text-green-500 hover:border-green-600 hover:bg-green-600 hover:text-foreground',
				'info-outline':
					'border border-blue-500 text-blue-500 hover:border-blue-600 hover:bg-blue-600 hover:text-foreground',
				destructive:
					'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
				'destructive-outline':
					'border border-red-500 text-red-500 hover:border-red-600 hover:bg-red-600 hover:text-foreground',
				outline:
					'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
				secondary:
					'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-9 px-4 py-2',
				sm: 'h-8 rounded-md px-3 text-xs',
				lg: 'h-10 rounded-md px-8',
				icon: 'h-9 w-9',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

export const availableThemes = [
	{
		name: 'Zinc',
		slug: 'zinc',
		activeColor: {
			light: '240 5.9% 10%',
			dark: '240 5.2% 33.9%',
		},
	},
	{
		name: 'Red',
		slug: 'red',
		activeColor: {
			light: '0 72.2% 50.6%',
			dark: '0 72.2% 50.6%',
		},
	},
	{
		name: 'Orange',
		slug: 'orange',
		activeColor: {
			light: '24.6 95% 53.1%',
			dark: '20.5 90.2% 48.2%',
		},
	},
	{
		name: 'Green',
		slug: 'green',
		activeColor: {
			light: '142.1 76.2% 36.3%',
			dark: '142.1 70.6% 45.3%',
		},
	},
	{
		name: 'Blue',
		slug: 'blue',
		activeColor: {
			light: '221.2 83.2% 53.3%',
			dark: '217.2 91.2% 59.8%',
		},
	},
	{
		name: 'Yellow',
		slug: 'yellow',
		activeColor: {
			light: '47.9 95.8% 53.1%',
			dark: '47.9 95.8% 53.1%',
		},
	},
	{
		name: 'Pink',
		slug: 'pink',
		activeColor: {
			light: '292.1 83.3% 57.8%',
			dark: '293.4 70% 50.4%',
		},
	},
];

export type AvailableThemeModes = 'light' | 'dark';
