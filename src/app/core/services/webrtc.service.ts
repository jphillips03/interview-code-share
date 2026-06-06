/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Peer, DataConnection, PeerOptions } from 'peerjs';

export type CodePayload =
    | { type: 'CODE_CHANGE'; text: string }
    | { type: 'LANGUAGE_CHANGE'; language: string };

// Define an interface to satisfy strict TypeScript object type validation
interface PeerJsError extends Error {
    type?: string;
}

@Injectable({
    providedIn: 'root'
})
export class WebRtcService {
    private ngZone = inject(NgZone);
    private peer: Peer | null = null;
    private conn: DataConnection | null = null;
    private fallbackPeerOptions = {
        config: {
            iceServers: [
                {
                    urls: 'stun:stun.relay.metered.ca:80'
                },
                {
                    urls: 'turn:global.relay.metered.ca:80',
                    username: '94e09760f9e235c04b0891b3',
                    credential: 'nqQ6dgzK2Dl7mHEp'
                },
                {
                    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                    username: '94e09760f9e235c04b0891b3',
                    credential: 'nqQ6dgzK2Dl7mHEp'
                },
                {
                    urls: 'turn:global.relay.metered.ca:443',
                    username: '94e09760f9e235c04b0891b3',
                    credential: 'nqQ6dgzK2Dl7mHEp'
                },
                {
                    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                    username: '94e09760f9e235c04b0891b3',
                    credential: 'nqQ6dgzK2Dl7mHEp'
                }
            ],
            // Optional: force the browser to prioritize relay candidates if debugging
            iceTransportPolicy: 'all' as RTCIceTransportPolicy
        }
    };

    public isConnected = signal<boolean>(false);
    public remoteCodeUpdate = signal<string | null>(null);
    public remoteLanguageUpdate = signal<string | null>(null);
    public currentRoomId = signal<string | null>(null);

    public initializePeer(roomId: string): void {
        if (this.peer) return; // Prevent double initialization
        this.currentRoomId.set(roomId);

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

        this.peer = new Peer(roomId, peerOptions);

        // Listener for Host (Interviewer) mode
        this.peer.on('connection', (incomingConnection) => {
            this.conn = incomingConnection;
            this.setupConnectionListeners();
        });

        this.peer.on('error', (err: PeerJsError) => {
            // 'unavailable-id' means the interviewer tab already registered this room namespace
            if (err.type === 'unavailable-id') {
                this.disconnectCurrentPeer();
                this.connectAsCandidate(roomId, peerOptions);
            } else {
                console.error('P2P Connection Error Exception:', err);
            }
        });
    }

    private connectAsCandidate(roomId: string, options: PeerOptions | undefined): void {
        const randomId = 'client-' + Math.random().toString(36).substring(7);
        this.peer = new Peer(randomId, options);

        this.peer.on('open', () => {
            this.conn = this.peer!.connect(roomId);
            this.setupConnectionListeners();
        });
    }

    private setupConnectionListeners(): void {
        if (!this.conn) return;

        this.conn.on('open', () => {
            // Force change detection inside Angular Zone boundaries
            this.ngZone.run(() => this.isConnected.set(true));
            console.log('🟢 Direct client-to-client data channel established!');
        });

        this.conn.on('data', (data: unknown) => {
            const payload = data as CodePayload;
            if (!payload) return;

            this.ngZone.run(() => {
                if (payload.type === 'CODE_CHANGE') {
                    this.remoteCodeUpdate.set(payload.text);
                } else if (payload.type === 'LANGUAGE_CHANGE') {
                    this.remoteLanguageUpdate.set(payload.language);
                }
            });
        });

        this.conn.on('close', () => {
            this.ngZone.run(() => this.isConnected.set(false));
        });
    }

    public broadcastCodeChange(code: string): void {
        if (this.conn && this.isConnected()) {
            this.conn.send({ type: 'CODE_CHANGE', text: code });
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
