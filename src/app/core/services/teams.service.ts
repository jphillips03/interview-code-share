/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
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
    // Track if the current user has been verified by the M365 infrastructure
    public isUserValidated = signal<boolean>(false);
    public authToken = signal<string | null>(null);
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

                    // Trigger token acquisition as soon as context is confirmed
                    this.acquireUserSecurityToken();

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
     * Leverages Teams Single Sign-On (SSO) to get a cryptographically secure
     * token proving the user's authentic identity.
     */
    private acquireUserSecurityToken(): void {
        teamsSDK.authentication
            .getAuthToken()
            .then((token) => {
                this.ngZone.run(() => {
                    this.authToken.set(token);
                    this.validateMeetingMembership(token);
                });
            })
            .catch((err) => {
                console.error('SSO Token acquisition rejected:', err);
                this.ngZone.run(() => {
                    this.isInitialized.set(true);
                });
            });
    }

    /**
     * Simulates/Executes client-side verification via Microsoft Graph API.
     */
    private validateMeetingMembership(token: string): void {
        const meetingId = this.meetingContext().meetingId;

        if (!meetingId) {
            this.isInitialized.set(true);
            return;
        }

        // In a serverless client, you the Graph API endpoint for meetings:
        // https://microsoft.com{meetingId}
        // passing the 'Authorization: Bearer ' + token header.
        fetch(`https://microsoft.com${meetingId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => {
                this.ngZone.run(() => {
                    if (res.ok) {
                        // 200 OK: Microsoft confirms this user is an attendee of this meeting!
                        this.isUserValidated.set(true);
                    } else {
                        // 403/404: User is signed into a different tenant or meeting entirely
                        this.isUserValidated.set(false);
                        console.warn('Security Blockade: User is not part of this meeting roster.');
                    }
                    this.isInitialized.set(true);
                });
            })
            .catch(() => {
                this.ngZone.run(() => {
                    this.isInitialized.set(true);
                });
            });
    }

    /**
     * Helper utility method to prompt Teams to share content straight to center stage.
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
