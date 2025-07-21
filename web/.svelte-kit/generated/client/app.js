import * as client_hooks from '../../../src/hooks.client.ts';


export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21')
];

export const server_loads = [0];

export const dictionary = {
		"/": [3],
		"/code-editor-demo": [4],
		"/color-picker-test": [5],
		"/command-palette-demo": [6],
		"/docs": [7,[2]],
		"/docs/api-reference/overview": [9,[2]],
		"/docs/getting-started/installation": [10,[2]],
		"/docs/user-guide/custom-panels": [11,[2]],
		"/docs/user-guide/keyboard-shortcuts": [12,[2]],
		"/docs/user-guide/mobile-usage": [13,[2]],
		"/docs/user-guide/terminal-persistence": [14,[2]],
		"/docs/[...slug]": [~8,[2]],
		"/file-explorer-demo": [15],
		"/layout-test": [16],
		"/login": [17],
		"/mobile-test": [18],
		"/panel-menu-demo": [19],
		"/panel-test": [20],
		"/test": [21]
	};

export const hooks = {
	handleError: client_hooks.handleError || (({ error }) => { console.error(error) }),
	init: client_hooks.init,
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.svelte';