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
	() => import('./nodes/12')
];

export const server_loads = [0];

export const dictionary = {
		"/": [3],
		"/docs": [4,[2]],
		"/docs/api-reference/overview": [6,[2]],
		"/docs/getting-started/installation": [7,[2]],
		"/docs/user-guide/custom-panels": [8,[2]],
		"/docs/user-guide/keyboard-shortcuts": [9,[2]],
		"/docs/user-guide/mobile-usage": [10,[2]],
		"/docs/user-guide/terminal-persistence": [11,[2]],
		"/docs/[...slug]": [~5,[2]],
		"/login": [12]
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