import { useState } from 'react';
import { toast } from 'sonner';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogAction,
} from '@/components/alert-dialog';
import { Button } from '@/components/button';
import { Loading } from '@/components/loading';

import api from '@/lib/api';
import { toastError } from '@/lib/utils';

export const ClearCache = () => {
	const [clearCacheLoading, setClearCacheLoading] = useState(false);

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="destructive-outline"
					size="sm"
					disabled={clearCacheLoading}
					className={clearCacheLoading ? 'disabled' : ''}
				>
					Clear Cache
					{clearCacheLoading && <Loading />}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Clear Cache</AlertDialogTitle>
					<AlertDialogDescription>
						This will delete all cache files related to this
						application. Should only be used for debugging purposes
						or if you are experiencing issues with the application.
						Are you sure you want to proceed?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-red-500 text-white hover:bg-red-700"
						onClick={async () => {
							setClearCacheLoading(true);
							try {
								await api.clear_cache();
								toast.success('Cache cleared successfully.');
								setTimeout(() => {
									window.location.reload();
								}, 500);
							} catch (error) {
								toastError(error);
							} finally {
								setClearCacheLoading(false);
							}
						}}
					>
						Clear Cache
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
