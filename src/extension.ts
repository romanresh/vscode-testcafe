'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "testcafe-test-runner" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let finder = new TestFinder();
    let disposable = vscode.commands.registerCommand('testcaferunner.run', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');

        // var editor = vscode.window.activeTextEditor;
        // if (!editor) {
        //     return; // No open text editor
        // }

        // var selection = editor.selection;
        // var text = editor.document.getText(selection);

        // // Display a message box to the user
        // vscode.window.showInformationMessage('Selected characters: ' + text.length);


            finder.updateCurrentTest();

        // Add to a list of disposables which are disposed when this extension is deactivated.
        
    });

    context.subscriptions.push(finder);
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TestFinder {
    private _statusBarItem: vscode.StatusBarItem;
    public updateCurrentTest() {
        let editor = vscode.window.activeTextEditor;
        if(!editor)
            return;
        let doc = editor.document;
        // if (doc.languageId !== "javascript")
        //     return;
        var test = this.findTest(editor.document, editor.selection);
        this.runTest(test || "Test not found");
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
    public runTest(name: string) {
        if (!this._statusBarItem)
            this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._statusBarItem.text = `TestCafe: ${name}`
        this._statusBarItem.show();
    }

    dispose() {
        if (this._statusBarItem)
            this._statusBarItem.dispose();
    }
}