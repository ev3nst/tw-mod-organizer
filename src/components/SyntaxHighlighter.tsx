import { useEffect, useState, useRef, useMemo } from 'react';
import { LightAsync } from 'react-syntax-highlighter';
import monokaiSublime from 'react-syntax-highlighter/dist/esm/styles/hljs/monokai-sublime';
import googlecode from 'react-syntax-highlighter/dist/esm/styles/hljs/googlecode';
import { VariableSizeList as List } from 'react-window';

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
	const [lines, setLines] = useState<string[]>([]);
	const [containerHeight, setContainerHeight] = useState(500);
	const [containerWidth, setContainerWidth] = useState(800);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setLines(content.split('\n'));
	}, [content]);

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

	useEffect(() => {
		if (containerRef.current) {
			const resizeObserver = new ResizeObserver(entries => {
				for (let entry of entries) {
					setContainerHeight(entry.contentRect.height);
					setContainerWidth(entry.contentRect.width);
				}
			});

			resizeObserver.observe(containerRef.current);
			return () => resizeObserver.disconnect();
		}
	}, []);

	const lineHeights = useMemo(() => {
		return lines.map(line => {
			const baseHeight = 21;
			const estimatedLineLength = Math.floor(containerWidth / 8);
			const wrappedLines = Math.ceil(line.length / estimatedLineLength);
			return baseHeight * Math.max(1, wrappedLines);
		});
	}, [lines, containerWidth]);

	const getLineHeight = (index: number) => {
		return lineHeights[index] || 21;
	};

	const LineRenderer = ({
		index,
		style,
	}: {
		index: number;
		style: React.CSSProperties;
	}) => {
		const line = lines[index] || '';

		return (
			<div style={style}>
				<div style={{ display: 'flex' }}>
					<span
						style={{
							minWidth: '2em',
							paddingRight: '0.5em',
							paddingLeft: '1em',
							color: '#888',
							userSelect: 'none',
						}}
					>
						{index + 1}
					</span>
					<span
						style={{
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-all',
						}}
					>
						<LightAsync
							language={syntax}
							style={
								mode === 'dark' ? monokaiSublime : googlecode
							}
							customStyle={{
								fontFamily:
									'"Fira Code", Consolas, Menlo, Monaco, "Courier New", monospace',
								fontSize: '13px',
								background: 'transparent',
								padding: 0,
								margin: 0,
							}}
						>
							{line}
						</LightAsync>
					</span>
				</div>
			</div>
		);
	};

	return (
		<div className="size-full" ref={containerRef}>
			<div
				className="size-full"
				style={{
					fontFamily:
						'"Fira Code", Consolas, Menlo, Monaco, "Courier New", monospace',
					fontSize: '13px',
					background: 'hsl(var(--background))',
				}}
			>
				{lines.length > 0 && (
					<List
						className="dark-scrollbar"
						height={containerHeight}
						itemCount={lines.length}
						itemSize={getLineHeight}
						width="100%"
						overscanCount={5}
						estimatedItemSize={21}
						useIsScrolling
					>
						{LineRenderer}
					</List>
				)}
			</div>
		</div>
	);
};
