/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CONFIG, TeamsService, WebRtcService } from '@app/core';
import { CodeEditorComponent } from '@app/shared';

@Component({
    selector: 'app-stage',
    standalone: true,
    imports: [CommonModule, FormsModule, CodeEditorComponent],
    templateUrl: './stage.component.html',
    styleUrls: ['./stage.component.scss']
})
export class StageComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private webRtcService = inject(WebRtcService);
    private teamsService = inject(TeamsService);

    protected isConnected = this.webRtcService.isConnected;
    protected remoteCodeUpdate = this.webRtcService.remoteCodeUpdate;
    protected roomId = signal<string>('Initializing...');
    protected selectedLanguage = signal<string>('java');
    protected selectedTheme = signal<string>('vs');

    constructor() {
        // Handle incoming remote language updates from WebRTC data pipeline
        effect(() => {
            const incomingLang = this.webRtcService.remoteLanguageUpdate();
            if (incomingLang && incomingLang !== this.selectedLanguage()) {
                this.selectedLanguage.set(incomingLang);
            }
        });

        // FIX TIME RACE CONDITION; Wait until Teams SDK completes its initialization
        // handshake before defining the room connection parameters otherwise language
        // changes are not recognized across rooms
        effect(() => {
            if (!this.teamsService.isInitialized()) return;

            if (this.teamsService.isInsideTeams()) {
                const teamsMeetingId = this.teamsService.meetingContext().meetingId;
                if (teamsMeetingId) {
                    this.roomId.set(teamsMeetingId);
                    this.webRtcService.initializePeer(teamsMeetingId);
                    return;
                }
            }

            // Safe Fallback path executes if we are verified to be in a regular web browser tab
            const browserUrlRoomId = this.route.snapshot.queryParams['room'];
            const assignedRoomId =
                browserUrlRoomId || 'room-' + Math.random().toString(36).substring(7);
            this.roomId.set(assignedRoomId);
            this.webRtcService.initializePeer(assignedRoomId);
        });
    }

    ngOnInit() {
        // Read starting language preference on component mount
        const langParam = this.route.snapshot.queryParams['lang'];
        if (langParam) {
            this.selectedLanguage.set(langParam);
        }
    }

    /**
     * Fires whenever changes occur within the localized child Monaco interface editor instance.
     * Streams out mutations immediately across the active direct WebRTC out-of-band data pipeline.
     */
    protected onLocalCodeChange(currentText: string): void {
        this.webRtcService.broadcastCodeChange(currentText);
    }

    /**
     * Fires whenever a local click modifies the theme switcher dropdown options.
     */
    protected onLocalLanguageChange(): void {
        this.webRtcService.broadcastLanguageChange(this.selectedLanguage());
    }

    /**
     * Fires whenever a local click modifies the theme switcher dropdown options.
     * Only updates locally, no reason to share theme across browsers...
     */
    protected onLocalThemeChange(newTheme: string): void {
        this.selectedTheme.set(newTheme);
    }

    /**
     * Generates and writes the standard external URL fallback layout address token straight
     * into the localized host system copy-paste buffer block array.
     */
    protected copyShareableFallbackLink(): void {
        // Generate a secure 32-character random string token
        const cryptoToken = crypto.randomUUID().replace(/-/g, '');
        const secureRoomId = `${this.roomId()}_token_${cryptoToken}`;
        const currentLang = this.selectedLanguage();

        const fallbackUrl = `${CONFIG.baseUrl}/#/stage?room=${secureRoomId}&lang=${currentLang}`;

        navigator.clipboard
            .writeText(fallbackUrl)
            .then(() =>
                alert(
                    'Secure one-time fallback interview link generated! Paste the URL in the Teams meeting chat window.'
                )
            )
            .catch((err) => console.error('Failed to copy fallback link to clipboard:', err));
    }

    ngOnDestroy() {
        // Graceful release of hardware stream sockets and discovery hooks upon navigation
        this.webRtcService.disconnect();
    }
}
