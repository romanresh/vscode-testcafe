'use strict';

import * as vscode from 'vscode';

export function activate(context:vscode.ExtensionContext) {
    let controller = new TestCafeTestController();

    vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', false);

    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInIE', () => {
            controller.runTests("ie");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInFirefox', () => {
            controller.runTests("firefox");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChrome', args => {
            controller.runTests("chrome");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInIE', args => {
            controller.startTestRun("ie", args._fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInFirefox', args => {
            controller.startTestRun("firefox", args._fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChrome', args => {
            controller.startTestRun("chrome", args._fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.repeatRun', () => {
            controller.repeatLastRun();
        })
    );
    context.subscriptions.push(controller);
    vscode.commands.executeCommand('setContext', 'testcaferunner.readyForUX', true);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TestCafeTestController {
    lastBrowser:string;
    lastFile:string;
    lastType:string;
    lastName:string;

    public runTests(browser:string) {
        let editor = vscode.window.activeTextEditor;

        if (!editor)
            return;

        let doc = editor.document;

        if (doc.languageId !== "javascript")
            return;

        var document = editor.document;
        var selection = editor.selection;
        var textBeforeSelection = document.getText(new vscode.Range(0, 0, selection.end.line, selection.end.character));

        var [type, name] = this.findTestOrFixtureName(textBeforeSelection);

        this.startTestRun(browser, document.fileName, type, name);
    }

    public repeatLastRun() {
        if (!this.lastBrowser || !this.lastFile || (this.lastType !== "file" && !this.lastName)) {
            vscode.window.showErrorMessage(`Previous test is not found.`);
            return;
        }

        this.startTestRun(this.lastBrowser, this.lastFile, this.lastType, this.lastName);
    }

    private getCroppedName(text):string {
        var name = text.charAt(0) === '(' ? text.substr(1, text.length - 2) : text;

        name = name.trim();

        return name.substr(1, name.length - 2);
    }

    private findTestOrFixtureName(text):string[] {
        var regex = /(^|;|\s+)fixture\s*(\(.+?\)|`.+?`)|(^|;|\s+)test\s*\(\s*(.+?)\s*,/gm;
        var match = regex.exec(text);
        var matches = [];

        while (match !== null) {
            if (match[1] !== "//") {
                var isTest = match[0].trim().indexOf('test') === 0;
                var name = isTest ? match[4] : match[2];

                matches.push({
                    type: isTest ? 'test' : 'fixture',
                    name: this.getCroppedName(name)
                });
            }
            else
                matches.push(null);

            match = regex.exec(text);
        }

        var lastOne = matches.pop();

        if (lastOne)
            return [lastOne.type, lastOne.name];

        return ['', ''];
    }

    public startTestRun(browser:string, filePath:string, type:string, name:string = "") {
        if (!type) {
            vscode.window.showErrorMessage(`Tests is not found or it's commented. Set cursor inside test() function`);
            return;
        }

        this.lastBrowser = browser;
        this.lastFile = filePath;
        this.lastType = type;
        this.lastName = name;

        var args = [browser, filePath];

        if (type !== "file") {
            args.push("--" + type);
            args.push(name);
        }

        vscode.commands.executeCommand("vscode.startDebug", {
            "type": "node",
            "request": "launch",
            "name": "Launch current test with TestCafe",
            "program": "${workspaceRoot}/node_modules/testcafe/bin/testcafe.js",
            "args": args,
            "cwd": "${workspaceRoot}"
        });
        vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', true);
    }

    dispose() {

    }
}