import { writable } from 'svelte/store';

export const roomId = writable();
export const inRoom = writable(false);
export const username = writable();
export const sendEnabled = writable(false);
export const messages = writable([]);
