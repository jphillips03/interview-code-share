/**
 * @license
 * Copyright Jonathan Phillips (https://github.com/jphillips03) All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at
 * https://github.com/jphillips03/interview-code-share/blob/main/LICENSE
 */

import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import loader from '@monaco-editor/loader';

import { CONFIG } from '@app/core';

@Component({
    selector: 'app-code-editor',
    standalone: true,
    imports: [],
    templateUrl: './code-editor.component.html',
    styleUrls: ['./code-editor.component.scss']
})
export class CodeEditorComponent implements OnInit, OnDestroy {
    @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
    @Output() codeChanged = new EventEmitter<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private editor: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private monacoInstance: any = null; // Store reference to the monaco engine
    private isHandlingRemoteUpdate = false;
    private _language = CONFIG.language;
    private _theme = CONFIG.theme;

    // Reactive setter to let Monaco shift language modes on the fly
    @Input() set language(value: string) {
        this._language = value;
        // If Monaco has already finished loading, force the syntax parser to swap schemas
        if (this.editor && this.monacoInstance) {
            const currentModel = this.editor.getModel();
            if (currentModel) {
                this.monacoInstance.editor.setModelLanguage(currentModel, value);
                console.log(`Monaco parser context successfully switched to: ${value}`);
            }
        }
    }
    get language(): string {
        return this._language;
    }

    // Theme input setter to force Monaco to swap themes natively on the fly
    @Input() set theme(value: string) {
        this._theme = value;
        if (this.monacoInstance) {
            this.monacoInstance.editor.setTheme(value);
            console.log(`Monaco Editor inner UI theme changed to: ${value}`);
        }
    }
    get theme(): string {
        return this._theme;
    }

    @Input() set remoteCode(value: string | null) {
        if (value !== null && this.editor) {
            const currentVal = this.editor.getValue();
            if (currentVal !== value) {
                const selection = this.editor.getSelection();
                this.isHandlingRemoteUpdate = true;
                this.editor.setValue(value);
                if (selection) this.editor.setSelection(selection);
                this.isHandlingRemoteUpdate = false;
            }
        }
    }

    ngOnInit() {
        loader.init().then((monaco) => {
            this.monacoInstance = monaco;
            this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
                value: CONFIG.defaultEditorText,
                language: this.language,
                theme: this.theme,
                automaticLayout: true,
                minimap: { enabled: true },
                fontSize: 14
            });

            this.editor.onDidChangeModelContent(() => {
                if (this.isHandlingRemoteUpdate) return;
                const currentText = this.editor.getValue();
                this.codeChanged.emit(currentText);
            });
        });
    }

    ngOnDestroy() {
        if (this.editor) this.editor.dispose();
    }
}
