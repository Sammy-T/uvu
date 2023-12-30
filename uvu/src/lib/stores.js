import { writable } from 'svelte/store';

export const username = writable();
export const roomId = writable();
export const inRoom = writable(false);
export const sendEnabled = writable(false);
export const screenShareEnabled = writable(false);
export const messages = writable([]);
export const streamConstraints = writable({video: false, audio: false});
export const localStream = writable();
export const localDisplayStream = writable();
export const remoteStreams = writable([]);
export const remoteStreamInfos = writable([]);
