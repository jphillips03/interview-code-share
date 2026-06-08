/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as app from '@microsoft/teams-js';

import { CONFIG, TeamsService, WebRtcService } from '@app/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-config',
    imports: [FormsModule],
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
    router = inject(Router);
    teamsService = inject(TeamsService);
    webRtcService = inject(WebRtcService);
    insideTeams = this.teamsService.isInsideTeams();
    selectedLanguage = CONFIG.language;
    turnUser = '';
    turnCred = '';

    ngOnInit() {
        // Initialize Teams SDK
        app.app.initialize().then(() => {
            // Inform Teams that the configuration is valid so it unlocks the native "Save" button
            app.pages.config.registerOnSaveHandler((saveEvent) => {
                // Define where Teams should point when loading the app inside the meeting
                const baseUrl = CONFIG.baseUrl;

                let turnString = '';
                if (this.turnUser && this.turnCred) {
                    const turnData = {
                        user: this.turnUser,
                        cred: this.turnCred
                    };
                    // Encrypt to safe Base64 token to prevent raw parameter characters from crashing URLs [3]
                    turnString = btoa(JSON.stringify(turnData));
                }

                app.pages.config
                    .setConfig({
                        suggestedDisplayName: 'Interview Code Share',
                        contentUrl: `${baseUrl}/#/side-panel?lang=${this.selectedLanguage}&turn=${turnString}`,
                        websiteUrl: `${baseUrl}/#/fallback`
                    })
                    .then(() => {
                        saveEvent.notifySuccess();
                    });
            });

            // Enable the save button immediately upon loading
            app.pages.config.setValidityState(true);
        });
    }

    onStart() {
        // Generate a secure 32-character random string token
        const roomId = 'interview_room';
        const cryptoToken = crypto.randomUUID().replace(/-/g, '');
        const secureRoomId = `${roomId}_token_${cryptoToken}`;
        const fallbackUrl = `${CONFIG.baseUrl}/#/stage`;

        if (this.turnUser && this.turnCred) {
            this.webRtcService.initializeOpenRelayCredentials(this.turnUser, this.turnCred);
        }

        // reset any cached data so previous code does not show
        this.webRtcService.resetLocalState();
        this.router.navigate([fallbackUrl], {
            queryParams: { room: secureRoomId, role: 'interviewer' }
        });
    }
}
