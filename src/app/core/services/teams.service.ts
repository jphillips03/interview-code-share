/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/ngx-material-dashboard/ngx-material-dashboard/blob/main/LICENSE
 */

import { Injectable, signal, inject, NgZone } from '@angular/core';
import * as teamsSDK from '@microsoft/teams-js';

export interface TeamsMeetingContext {
    meetingId: string | null;
    tenantId: string | null;
    userPrincipalName: string | null;
    isAnonymous: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class TeamsService {
    private ngZone = inject(NgZone);

    public isInsideTeams = signal<boolean>(false);
    public isInitialized = signal<boolean>(false);
    public meetingContext = signal<TeamsMeetingContext>({
        meetingId: null,
        tenantId: null,
        userPrincipalName: null,
        isAnonymous: true
    });

    constructor() {
        this.initializeTeamsSDK();
    }

    /**
     * Initializes the Teams JS SDK bridge connection safely.
     */
    private initializeTeamsSDK(): void {
        teamsSDK.app
            .initialize()
            .then(() => {
                // Successfully connected to a native Teams shell instance wrapper
                return teamsSDK.app.getContext();
            })
            .then((context) => {
                // Wrap state mutations inside NgZone to keep Angular tracking lifecycle changes
                this.ngZone.run(() => {
                    this.isInsideTeams.set(true);
                    this.isInitialized.set(true);

                    this.meetingContext.set({
                        meetingId: context.meeting?.id || null,
                        tenantId: context.user?.tenant?.id || null,
                        userPrincipalName: context.user?.userPrincipalName || null,
                        isAnonymous: context.user?.loginHint ? false : true
                    });

                    console.log('Successfully mapped Microsoft Teams system context parameters.');
                });
            })
            .catch((err) => {
                // SDK fails to load safely if opened in a standard external web browser tab
                this.ngZone.run(() => {
                    this.isInsideTeams.set(false);
                    this.isInitialized.set(true);
                });
                console.warn(
                    'Teams SDK initialization omitted. Operating in standard web container mode.',
                    err
                );
            });
    }

    /**
     * Helper utility method to prompt Teams to share content straight to center stage.
     * Exposing this from a service keeps your SidePanel component lightweight.
     */
    public shareAppViewToMeetingStage(targetStageUrl: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.isInsideTeams()) {
                return reject(
                    'Cannot invoke stage presentation utility outside native Teams client wrappers.'
                );
            }

            teamsSDK.meeting.shareAppContentToStage((err, result) => {
                if (err) {
                    console.error('Teams Stage Share Exception:', err);
                    return resolve(false);
                }
                console.log('Teams Stage Sharing successfully opened:', result);
                return resolve(true);
            }, targetStageUrl);
        });
    }
}
