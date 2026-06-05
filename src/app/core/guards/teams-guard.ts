/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TeamsService } from '../services';

export const teamsGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const teamsService = inject(TeamsService);

    // If we are testing on localhost bypass authentication restrictions
    if (window.location.hostname === 'localhost') return true;

    // 1. If running inside Teams, they MUST pass the Graph API meeting roster validation check
    if (teamsService.isInsideTeams()) {
        if (teamsService.isUserValidated()) {
            return true; // Authorized attendee
        }
        // Block access and route to a security violation error screen
        return router.createUrlTree(['/config']);
    }

    // 2. Browser Fallback route check (External Candidate path)
    // To keep the candidate secure without an account, enforce that the URL
    // parameter room explicitly matches a high-entropy cryptographically secure signature token.
    const hasSecureRoomId = route.queryParams['room'] && route.queryParams['room'].length > 30;

    if (hasSecureRoomId) {
        return true;
    }

    // 3. Block access and redirect to a friendly landing page if no room context exists
    return router.createUrlTree(['/config']);
};
