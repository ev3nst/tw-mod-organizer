import React from 'react';
import { Button } from '@/components/button';
import { WindowActions } from '@/header/window-actions';

interface ErrorBoundaryProps {
	children: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	errorMessage: string;
	errorStack: string;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, errorMessage: '', errorStack: '' };
	}

	componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
		console.error('Error in component:', error, errorInfo);

		let errorMessage = 'An unknown error occurred';
		let errorStack = '';

		if (error instanceof Error) {
			errorMessage = error.message;
			errorStack = error.stack || 'No stack trace available';
		} else if (typeof error === 'string') {
			errorMessage = error;
		} else if (error && typeof error === 'object') {
			errorMessage = JSON.stringify(error);
		}

		this.setState({ hasError: true, errorMessage, errorStack });
	}

	render(): React.ReactNode {
		if (this.state.hasError) {
			return (
				<main>
					<div className="flex justify-between app-drag-region border-b fixed top-0 left-0 right-0 py-1">
						<div className="flex items-center gap-4 py-1 px-3">
							<img src="/logo.png" className="h-6 w-6" />
							<div className="text-sm font-bold">
								TW Mod Organizer
							</div>
						</div>
						<WindowActions className="px-1" />
					</div>

					<div className="flex items-center justify-center h-screen w-screen app-drag-region">
						<div className="relative text-left max-w-3xl p-6  text-white rounded-md">
							<h1 className="text-4xl font-semibold text-red-500">
								Error
							</h1>
							<p className="mt-4 text-lg">
								{this.state.errorMessage}
							</p>

							<h2 className="mt-6 text-2xl font-medium">
								Stack Trace
							</h2>
							<pre className="mt-2 p-4 bg-black text-sm overflow-auto max-h-[400px] rounded-md border border-gray-700">
								{this.state.errorStack}
							</pre>

							<div className="mt-6 flex gap-4">
								<Button
									onClick={() => window.location.reload()}
								>
									Reload
								</Button>
								<Button
									onClick={() => {
										navigator.clipboard.writeText(
											`${this.state.errorMessage}\n\n${this.state.errorStack}`,
										);
									}}
								>
									Copy Error
								</Button>
							</div>
						</div>
					</div>
				</main>
			);
		}

		return this.props.children;
	}
}
