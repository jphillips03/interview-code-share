/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/ngx-material-dashboard/ngx-material-dashboard/blob/main/LICENSE
 */

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as app from '@microsoft/teams-js';

import { CONFIG } from '@app/core';

@Component({
    selector: 'app-config',
    imports: [FormsModule],
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
    selectedLanguage = CONFIG.language;

    ngOnInit() {
        // Initialize Teams SDK
        app.app.initialize().then(() => {
            // Inform Teams that the configuration is valid so it unlocks the native "Save" button
            app.pages.config.registerOnSaveHandler((saveEvent) => {
                // Define where Teams should point when loading the app inside the meeting
                const baseUrl = CONFIG.baseUrl;

                app.pages.config
                    .setConfig({
                        suggestedDisplayName: 'P2P Code Share',
                        contentUrl: `${baseUrl}#/side-panel?lang=${this.selectedLanguage}`,
                        websiteUrl: `${baseUrl}#/fallback`
                    })
                    .then(() => {
                        saveEvent.notifySuccess();
                    });
            });

            // Enable the save button immediately upon loading
            app.pages.config.setValidityState(true);
        });
    }
}
