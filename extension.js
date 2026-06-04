/**
 * @file extension.js
 * @description Application bootstrap. Bridges user lifecycle triggers smoothly to the 
 * respective pre-flight and post-flight validation loops wrapped around Kilo CLI.
 */

const vscode = require('vscode');
const { exec } = require('child_process');
const BootSequence = require('./src/gates/bootSequence');
const PrePromptSuite = require('./src/gates/prePromptSuite');
const PostPromptSuite = require('./src/gates/postPromptSuite');

const sessionState = { hops: 0 };

function activate(context) {
    const logChannel = vscode.window.createOutputChannel("Kilo Bridge Monitor");
    logChannel.show(true);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Run dependency self-install check transparently on startup initialization loops
    BootSequence.runBootAudit(workspacePath, logChannel).then(ready => {
        if (!ready) logChannel.appendLine(`⚠️ [BOOT]: Environment configurations incomplete or package upgrades are currently running.`);
    });

    // COMMAND ENTRYPOINT 1: Repository configuration profile deployment lock (/repo_init)
    let initCmd = vscode.commands.registerCommand('aidde.repoInit', async () => {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Hardening Repository Rulesets..." }, async () => {
            const ok = await BootSequence.runRepoInit(workspacePath, logChannel);
            if (ok) vscode.window.showInformationMessage("Kilo Bridge: Safety controls established successfully.");
        });
    });

    // COMMAND ENTRYPOINT 2: Core Task Routing Through Guard Gates
    let taskCmd = vscode.commands.registerCommand('aidde.executeTask', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const rawPrompt = await vscode.window.showInputBox({ prompt: "Describe your code modification requirement details:" });
        if (!rawPrompt) return;

        // 1. Fire Pre-Prompt Security Check (Git sync, type locality mapping)
        const gitContext = await PrePromptSuite.validateAndHydrate(workspacePath, rawPrompt, sessionState, logChannel);
        if (!gitContext) return;

        logChannel.appendLine(`[KILO CLI]: Launching task execution thread headlessly...`);
        const escapedPrompt = gitContext.compiledPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');

        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Kilo Bridge: Compiling code mutations..." }, (progress) => {
            return new Promise((resolve) => {
                // Execute Kilo securely over the background thread
                exec(`kilo run "${escapedPrompt}" --auto`, { cwd: workspacePath }, async (err, stdout, stderr) => {
                    if (err) {
                        logChannel.appendLine(`❌ [KILO RUNTIME FAULT]: Thread processing aborted: ${err.message}`);
                        resolve();
                        return;
                    }

                    logChannel.appendLine(`\n[Kilo execution complete. Transitioning to verification suites...]`);

                    // 3. Fire Post-Prompt Structural Analysis Engine Check (100-line law, trace tagging)
                    const clear = await PostPromptSuite.verifyAndCommit(workspacePath, editor.document.uri.fsPath, gitContext, logChannel);
                    if (clear) {
                        vscode.window.showInformationMessage("Kilo Bridge: Changes passed validation and are committed successfully.");
                    } else {
                        vscode.window.showErrorMessage("Kilo Bridge: Changes rejected by safety compliance criteria.");
                    }
                    resolve();
                });
            });
        });
    });

    context.subscriptions.push(initCmd, taskCmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
                          
