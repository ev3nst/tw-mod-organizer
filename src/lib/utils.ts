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
		console.log('toast?');
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
	saveFile?: SaveFile,
) {
	const reverseLoadOrder = [...mods].slice().reverse();
	let addDirectoryTxt = '';
	let usedModsTxt = '';
	for (let ri = 0; ri < reverseLoadOrder.length; ri++) {
		if (isSeparator(reverseLoadOrder[ri])) continue;

		const mod = reverseLoadOrder[ri] as ModItem;
		const isActive = modActivationData.some(
			a => a.is_active === true && a.mod_id === mod.identifier,
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
		save_game,
	);
}

export async function startGameBannerlord(
	app_id: number,
	mods: ModItemSeparatorUnion[],
	modActivationData: ModActivationItem[],
	saveFile?: SaveFile,
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
						m.identifier !== 'BirthAndDeath',
				),
		)
		.map(m => {
			return {
				identifier: m.identifier,
				bannerlord_id: (m as ModItem).game_specific_id,
				mod_path: (m as ModItem).mod_file_path,
			};
		});

	let save_game: string | undefined = '';
	if (
		typeof saveFile?.path !== 'undefined' &&
		saveFile?.path !== null &&
		saveFile?.path !== '' &&
		saveFile?.path.includes('\\')
	) {
		save_game = saveFile.path.split('\\').pop();
	}

	const command = await api.start_game_bannerlord(
		app_id,
		modsToLoad,
		save_game,
	);
	return command;
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
					'border border-green-500 text-green-500 hover:border-green-600 hover:bg-green-600 hover:text-white',
				'info-outline':
					'border border-blue-500 text-blue-500 hover:border-blue-600 hover:bg-blue-600 hover:text-white',
				destructive:
					'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
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
	},
);
