import { firebaseConfig } from './firebase-config';
import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { roomId } from './stores';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const config = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

const dbRoot = 'uvu';

let localUid = Math.random().toString(36).slice(-8);

/** @type {import ('firebase/firestore').DocumentReference | null} */
let roomRef;

/** @type {import ('firebase/firestore').CollectionReference | null} */
let connectionsRef;

export async function createRoom() {
    try {
        const roomData = {
            participants: [localUid],
            created: serverTimestamp()
        };

        roomRef = await addDoc(collection(db, dbRoot), roomData);
        connectionsRef = collection(db, roomRef.path, 'connections');

        console.log(`Created room. ID: ${roomRef.id}`);

        roomId.set(roomRef.id);
    } catch(error) {
        console.error('Unable to create room.', error);
        throw error;
    }
}

export async function exitRoom() {
    try {
        if(!roomRef) throw new Error('Missing room ref.');

        await deleteDoc(roomRef);
        console.log(`Deleted room. ID: ${roomRef.id}`);

        roomRef = null;
        roomId.set(null);
    } catch(error) {
        console.error('Unable to exit room.', error);
        throw error;
    }
}
