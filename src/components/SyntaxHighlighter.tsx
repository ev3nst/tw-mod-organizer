import { useEffect, useState } from 'react';
import { LightAsync } from 'react-syntax-highlighter';
import monokaiSublime from 'react-syntax-highlighter/dist/esm/styles/hljs/monokai-sublime';
import googlecode from 'react-syntax-highlighter/dist/esm/styles/hljs/googlecode';

import { ScrollArea } from '@/components/scroll-area';

export const SyntaxHighlighter = ({
	syntax,
	content,
}: {
	syntax: string;
	content: string;
}) => {
	const [mode, setMode] = useState<'dark' | 'light'>(() => {
		return (localStorage.getItem('mode') as 'dark' | 'light') || 'dark';
	});

	useEffect(() => {
		const observer = new MutationObserver(() => {
			const current = document.documentElement.classList.contains('dark')
				? 'dark'
				: 'light';
			setMode(current);
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => observer.disconnect();
	}, []);

	return (
		<ScrollArea className="overflow-y-auto h-full overflow-x-hidden">
			<LightAsync
				language={syntax}
				style={mode === 'dark' ? monokaiSublime : googlecode}
				wrapLongLines
				wrapLines
				showLineNumbers
				customStyle={{
					fontFamily:
						'"Fira Code", Consolas, Menlo, Monaco, "Courier New", monospace',
					fontSize: '13px',
					borderRadius: 0,
					background: 'hsl(var(--background))',
				}}
				lineProps={{ style: { flexWrap: 'wrap' } }}
				lineNumberStyle={{
					minWidth: '2em',
					paddingRight: '0.5em',
					color: '#888',
				}}
			>
				{content}
			</LightAsync>
		</ScrollArea>
	);
};
