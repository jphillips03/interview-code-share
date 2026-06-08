/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Peer, DataConnection } from 'peerjs';
import { EditorPayload } from '@app/shared';
import { CONFIG } from '../constants';

export type CodePayload =
    | { type: 'CODE_CHANGE'; payload: EditorPayload }
    | { type: 'LANGUAGE_CHANGE'; language: string };

// Define an interface to satisfy strict TypeScript object type validation
interface PeerJsError extends Error {
    type?: string;
}

/**
 * Handles p2p initialization, setting up appropriate listeners, and disconnect.
 * Requires valid username/credential combination for open relay metered TURN
 * servers to handle the initial handshake between peers.
 */
@Injectable({
    providedIn: 'root'
})
export class WebRtcService {
    private ngZone = inject(NgZone);
    private peer: Peer | null = null;
    private conn: DataConnection | null = null;
    private isInterviewer = false;

    public editorState = signal<EditorPayload>({
        text: sessionStorage.getItem('editor_text') || '',
        version: Number(sessionStorage.getItem('editor_version')) || 0
    });
    public isConnected = signal<boolean>(false);
    public remoteCodeUpdate = signal<string | null>(null);
    public remoteLanguageUpdate = signal<string | null>(null);
    public connectionStatus = signal<string>('⚡ Waiting for Peer Connection...');
    public currentRoomId = signal<string | null>(null);

    private fallbackPeerOptions = {};

    public initializeOpenRelayCredentials(username: string, credential: string) {
        this.fallbackPeerOptions = {
            config: {
                iceServers: [
                    {
                        urls: 'turns:standard.relay.metered.ca:443?transport=tcp',
                        username: username,
                        credential: credential
                    },
                    {
                        urls: 'turn:standard.relay.metered.ca:443',
                        username: username,
                        credential: credential
                    },
                    {
                        urls: 'stun:stun.relay.metered.ca:80'
                    }
                ],
                // Optional: force the browser to prioritize relay candidates if debugging
                iceTransportPolicy: 'relay' as RTCIceTransportPolicy
            }
        };
        console.log(this.fallbackPeerOptions);
    }

    public initializePeer(roomId: string, role: 'interviewer' | 'candidate'): void {
        this.isInterviewer = role === 'interviewer';
        this.currentRoomId.set(roomId);

        // Cache the connection parameters to survive a browser refresh
        sessionStorage.setItem('shared_room_id', roomId);
        sessionStorage.setItem('user_role', role);

        // Dynamic Connection Configurations
        // If on localhost, we configure PeerJS to look for a local environment setup
        // If deployed on GitHub Pages, it connects to the standard PeerJS cloud network
        const isLocal =
            window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        const peerOptions = isLocal
            ? {
                  host: 'localhost',
                  port: 9000,
                  path: '/interview-code-share',
                  debug: 3
              }
            : this.fallbackPeerOptions;

        console.log(
            `Initializing PeerJS in ${isLocal ? 'LOCAL LOOPBACK' : 'PRODUCTION CLOUD'} mode.`
        );

        if (this.isInterviewer) {
            // Interviewer opens a room using the Room ID as their explicit Peer ID
            this.peer = new Peer(roomId, peerOptions);
        } else {
            // Candidate spins up a random Peer ID and will connect out to the Room ID
            const randomId = 'client-' + Math.random().toString(36).substring(7);
            this.peer = new Peer(randomId, peerOptions);
        }

        this.peer.on('open', (id) => {
            console.log(`Peer opened with ID: ${id}. Role: ${role}`);

            if (!this.isInterviewer) {
                // Candidate automatically dials the interviewer's Room ID
                this.connectToPeer(roomId);
            }
        });

        // Both sides listen for incoming connections
        // (Crucial for when the Candidate refreshes and reconnects to the Interviewer)
        this.peer.on('connection', (incomingConn) => {
            this.setupConnectionListeners(incomingConn);
        });

        this.peer.on('error', (err: PeerJsError) => {
            console.error('PeerJS global error:', err);
            // Handle ID-taken errors gracefully if an interviewer refreshes before the old session times out
            if (err.type === 'unavailable-id' && this.isInterviewer) {
                this.connectionStatus.set('⏳ Room ID busy, retrying...');
                setTimeout(() => this.initializePeer(roomId, role), 3000);
            }
        });
    }

    public connectToPeer(remoteId: string): void {
        if (!this.peer) return;

        this.connectionStatus.set('⚡ Reconnecting...');
        const outgoingConn = this.peer.connect(remoteId, { reliable: true });
        this.setupConnectionListeners(outgoingConn);
    }

    private setupConnectionListeners(connection: DataConnection): void {
        this.conn = connection;
        sessionStorage.setItem('remote_peer_id', connection.peer);

        this.conn.on('open', () => {
            // Force change detection inside Angular Zone boundaries
            this.ngZone.run(() => {
                this.connectionStatus.set('🟢 Peer Connected (Direct P2P)');
                this.isConnected.set(true);
            });
            this.broadcastCodeChange();
            console.log('🟢 Direct client-to-client data channel established!');
        });

        this.conn.on('data', (data: unknown) => {
            const payload = data as CodePayload;
            if (!payload) return;

            this.ngZone.run(() => {
                if (payload.type === 'CODE_CHANGE') {
                    this.remoteCodeUpdate.set(payload.payload.text);
                    this.handleIncomingUpdate(payload.payload);
                } else if (payload.type === 'LANGUAGE_CHANGE') {
                    this.remoteLanguageUpdate.set(payload.language);
                }
            });
        });

        this.conn.on('close', () => {
            this.ngZone.run(() => {
                this.connectionStatus.set('⛔ Disconnected...');
                this.isConnected.set(false);
            });
            this.disconnect();
            this.conn = null;
        });
    }

    /**
     * Resets the local state in case there is any cached data from previous interview.
     */
    public resetLocalState() {
        this.saveAndSetState(CONFIG.defaultEditorText, 1);
    }

    /**
     * Updates local state and caches if incoming version is newer.
     * Increments local counter if local modifications are made.
     */
    public updateLocalState(text: string, incomingVersion?: number): boolean {
        const current = this.editorState();

        // Remote update coming over WebRTC
        if (incomingVersion !== undefined) {
            if (incomingVersion <= current.version) {
                return false; // Outdated version; drop it.
            }
            this.saveAndSetState(text, incomingVersion);
            return true;
        }

        // Local update driven by user typing in Monaco
        const nextVersion = current.version + 1;
        this.saveAndSetState(text, nextVersion);
        this.broadcastCodeChange();
        return true;
    }

    private saveAndSetState(text: string, version: number): void {
        this.editorState.set({ text, version });
        sessionStorage.setItem('editor_text', text);
        sessionStorage.setItem('editor_version', version.toString());
    }

    private handleIncomingUpdate(incoming: EditorPayload): void {
        const accepted = this.updateLocalState(incoming.text, incoming.version);
        if (!accepted && incoming.version < this.editorState().version) {
            this.broadcastCodeChange();
        }
    }

    public broadcastCodeChange(): void {
        if (this.conn && this.isConnected()) {
            this.conn.send({
                type: 'CODE_CHANGE',
                payload: this.editorState()
            });
        }
    }

    // broadcast language mutations over the direct data connection
    public broadcastLanguageChange(language: string): void {
        if (this.conn && this.isConnected()) {
            this.conn.send({ type: 'LANGUAGE_CHANGE', language });
        }
    }

    private disconnectCurrentPeer(): void {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }

    public disconnect(): void {
        if (this.conn) this.conn.close();
        this.disconnectCurrentPeer();
        this.isConnected.set(false);
    }
}
