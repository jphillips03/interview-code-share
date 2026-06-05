import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StageComponent } from './stage.component';

describe('Stage', () => {
    let component: StageComponent;
    let fixture: ComponentFixture<StageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StageComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(StageComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
