/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/ngx-material-dashboard/ngx-material-dashboard/blob/main/LICENSE
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const teamsGuard: CanActivateFn = (route) => {
    const router = inject(Router);

    // 1. Check if a room ID exists in the query parameters (Browser Fallback path)
    const hasRoomParam = !!route.queryParams['room'];

    // 2. Check if the user is loading inside Teams (via userAgent or referrer)
    // Teams frames typically pass context, but as a secondary fallback check:
    const isInsideTeamsFrame = window.self !== window.top;

    if (hasRoomParam || isInsideTeamsFrame) {
        return true; // Allow the user to access the /stage workspace
    }

    // 3. Block access and redirect to a friendly landing page if no room context exists
    return router.createUrlTree(['/config']);
};
