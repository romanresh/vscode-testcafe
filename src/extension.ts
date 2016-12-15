'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let controller = new TestCafeTestController();
    
    vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', false);

    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runIE', () => {
            controller.runCurrentTest("ie");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runFirefox', () => {
            controller.runCurrentTest("firefox");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runChrome', () => {
            controller.runCurrentTest("chrome");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.repeatRun', () => {
            controller.repeatLastTest();
        })
    );
    context.subscriptions.push(controller);
    vscode.commands.executeCommand('setContext', 'testcaferunner.readyForUX', true);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TestCafeTestController {
    lastBrowser: string;
    lastFile: string;
    lastTest: string;

    public runCurrentTest(browser: string) {
        let editor = vscode.window.activeTextEditor;
        if(!editor)
            return;
        let doc = editor.document;
        if (doc.languageId !== "javascript")
            return;
        var test = this.findTest(editor.document, editor.selection);
        this.runTest(test, browser, editor.document.fileName);
    }
    public repeatLastTest() {
        if(!this.lastTest || !this.lastBrowser || !this.lastFile) {
             vscode.window.showErrorMessage(`Previous test is not found.`);
             return;
        }
        this.runTest(this.lastTest, this.lastBrowser, this.lastFile);
    }
    private findTest(document: vscode.TextDocument, selection: vscode.Selection): string {
        var text = document.getText(new vscode.Range(0, 0, selection.end.line, selection.end.character));
        var regex = /^[\s]*([\/]{0,2})[\s]*test\((['|"|`][^'"`]+['|"|`])/gm;
        
        var match = regex.exec(text);
        var tests: string[] = []; 

        while(match !== null) {
            if(match[1] !== "//")
                tests.push(match[2]);
            else
                tests.push("");
            match = regex.exec(text);
        }
        
        return tests[tests.length - 1];
    }
    public runTest(name: string, browser: string, filePath: string) {
        if(!name) {
             vscode.window.showErrorMessage(`Test is not found: test() function is not found or it's commented. Set cursor inside test() function`);
             return;
        }
        this.lastBrowser = browser;
        this.lastTest = name;
        this.lastFile = filePath;
        //vscode.window.showInformationMessage(`Running test: ${name}`);
        vscode.commands.executeCommand("vscode.startDebug", {
            "type": "node",
            "request": "launch",
            "name": "Launch current test with TestCafe",
            "program": "${workspaceRoot}/node_modules/testcafe/bin/testcafe.js",
            "args": [
                browser,
                filePath,
                "--test",
                name.substr(1, name.length - 2)
            ],
            "cwd": "${workspaceRoot}"
        });
        vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', true);
    }

    dispose() { 
        
    }
}