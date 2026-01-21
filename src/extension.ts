import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "markdown-list-helper" is now active!');

    // 注册有序列表命令
    const orderedListCommand = vscode.commands.registerCommand(
        'markdownListHelper.addOrderedList',
        () => {
            handleListType('ordered');
        }
    );

    // 注册无序列表命令
    const unorderedListCommand = vscode.commands.registerCommand(
        'markdownListHelper.addUnorderedList',
        () => {
            handleListType('unordered');
        }
    );

	const blockQuoteCommand = vscode.commands.registerCommand(
        'markdownListHelper.addBlockQuote',
        () => {
            handleListType('blockquote');
        }
    );

    context.subscriptions.push(orderedListCommand, unorderedListCommand, blockQuoteCommand);
}

// 修改类型定义，增加 'blockquote'
function handleListType(type: 'ordered' | 'unordered' | 'blockquote') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const document = editor.document;
    const edits: vscode.TextEdit[] = [];

    for (const selection of editor.selections) {
        const startLine = selection.start.line;
        const endLine = selection.end.line;

        let startNumber = 1;
        let baseIndent = ''; // 基础缩进

        // --- 智能检测前一行逻辑 ---
        if (type === 'ordered' && startLine > 0) {
            const prevLineText = document.lineAt(startLine - 1).text;
            const match = prevLineText.match(/^(\s*)(\d+)(\.|\))\s+/);
            if (match) {
                baseIndent = match[1];
                startNumber = parseInt(match[2], 10) + 1;
            }
        } else if (type === 'unordered' && startLine > 0) {
             const prevLineText = document.lineAt(startLine - 1).text;
             const match = prevLineText.match(/^(\s*)([-*+]|\d+\.|\d+\))\s+/);
             if (match) {
                 baseIndent = match[1];
             }
        } 
        // --- 新增：块引用的前一行检测 ---
        else if (type === 'blockquote' && startLine > 0) {
             const prevLineText = document.lineAt(startLine - 1).text;
             // 如果前一行是块引用 (> )，则继承其缩进
             const match = prevLineText.match(/^(\s*)>\s+/);
             if (match) {
                 baseIndent = match[1];
             }
        }
        // ---------------------------------

        for (let i = startLine; i <= endLine; i++) {
            const lineText = document.lineAt(i).text;
            let newPrefix = '';

            if (type === 'ordered') {
                const currentNumber = startNumber + (i - startLine);
                newPrefix = `${baseIndent}${currentNumber}. `;
            } else if (type === 'unordered') {
                newPrefix = `${baseIndent}- `;
            } 
            // --- 新增：构造块引用前缀 ---
            else if (type === 'blockquote') {
                newPrefix = `${baseIndent}> `;
            }
            // ------------------------------

            // --- 修改正则：加入对 > 的匹配 ---
            // 原来的: /^(\s*)(\d+\.|\d+\)|[-*+])\s+/
            // 新的: 在括号里加一个 |
            const existingListRegex = /^(\s*)(\d+\.|\d+\)|[-*+]|>)\s+/;
            const existingMatch = lineText.match(existingListRegex);
            // -------------------------------

            if (existingMatch) {
                const range = new vscode.Range(i, 0, i, existingMatch[0].length);
                edits.push(vscode.TextEdit.replace(range, newPrefix));
            } else {
                const position = new vscode.Position(i, 0);
                edits.push(vscode.TextEdit.insert(position, newPrefix));
            }
        }
    }

    editor.edit((editBuilder) => {
        edits.forEach((edit) => {
            editBuilder.replace(edit.range, edit.newText);
        });
    });
}

export function deactivate() {}
