/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import { Routes } from '@angular/router';
import { ConfigComponent, SidePanelComponent, StageComponent } from './features';
import { teamsGuard } from './core';

export const routes: Routes = [
    { path: 'config', component: ConfigComponent },
    { path: 'side-panel', component: SidePanelComponent },
    {
        path: 'stage',
        component: StageComponent,
        canActivate: [teamsGuard]
    },
    { path: '', redirectTo: 'stage', pathMatch: 'full' },
    { path: '**', redirectTo: 'stage' }
];
