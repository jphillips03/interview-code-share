import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { teamsGuard } from './teams-guard';

describe('teamsGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => teamsGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
