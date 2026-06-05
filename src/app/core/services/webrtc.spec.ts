import { TestBed } from '@angular/core/testing';

import { WebRtcService } from './webrtc.service';

describe('Webrtc', () => {
    let service: WebRtcService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(WebRtcService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
