import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/accordion';

import type { ModSeparatorItem } from '@/lib/store/mod_separator';

type SeparatorsProps = {
	data: ModSeparatorItem[];
};

export const Separators = ({ data }: SeparatorsProps) => {
	return (
		<AccordionItem value="separators">
			<AccordionTrigger className="text-md">Separators</AccordionTrigger>
			<AccordionContent>
				{data.map(sep => (
					<div
						key={`import_profile_separator_${sep.identifier}`}
						className="mb-2 rounded-sm px-3 py-1.5"
						style={{
							color: sep.text_color,
							backgroundColor: sep.background_color,
						}}
					>
						{sep.title}
					</div>
				))}
			</AccordionContent>
		</AccordionItem>
	);
};
