import type { Preview } from '@storybook/sveltekit';
import '../src/routes/layout.css';

if (typeof document !== 'undefined') {
	document.documentElement.classList.add('dark');
	document.body.classList.add('bg-background', 'text-foreground');
}

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		a11y: {
			test: 'todo'
		}
	}
};

export default preview;
