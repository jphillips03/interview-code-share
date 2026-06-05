/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/ngx-material-dashboard/ngx-material-dashboard/blob/main/LICENSE
 */

import { UpperCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as teamsSDK from '@microsoft/teams-js';

@Component({
    selector: 'app-side-panel',
    standalone: true,
    imports: [UpperCasePipe],
    templateUrl: './side-panel.component.html',
    styleUrls: ['./side-panel.component.scss']
})
export class SidePanelComponent implements OnInit {
    private route = inject(ActivatedRoute);
    selectedLanguage = signal<string>('javascript');
    isTeamsAvailable = signal<boolean>(false);

    ngOnInit() {
        // 1. Extract the language query parameter passed forward by the Config Component
        const langParam = this.route.snapshot.queryParams['lang'];
        if (langParam) {
            this.selectedLanguage.set(langParam);
        }

        // 2. Safely initialize and detect the Teams context wrapper environment
        teamsSDK.app
            .initialize()
            .then(() => {
                this.isTeamsAvailable.set(true);
            })
            .catch((err) => {
                console.warn('Sidepanel loaded outside native Teams client environment.', err);
            });
    }

    /**
     * Instructs the Teams client wrapper to blast the app directly onto
     * the large, main center screen area for all meeting attendees.
     */
    shareToMeetingStage() {
        if (!this.isTeamsAvailable()) return;

        // Define the static target endpoint for the shared stage workspace view
        const baseUrl = 'https://<your-username>.github.io/<repo-name>/index.html';
        const stageUrl = `${baseUrl}#/stage?lang=${this.selectedLanguage()}`;

        // Invoke the explicit application sharing mechanism in the meeting module
        teamsSDK.meeting.shareAppContentToStage((err, result) => {
            if (err) {
                console.error('Failed to share custom application view onto center stage:', err);
            } else {
                console.log(
                    'Successfully requested application center stage presentation:',
                    result
                );
            }
        }, stageUrl);
    }
}
