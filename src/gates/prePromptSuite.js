/**
 * @file prePromptSuite.js
 * @description Intercepts tasks before passing them to Kilo CLI to ensure single-task atomic scope, 
 * provision tracking branches, and inject structural reference schemas.
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const Shell = require('./shell');

class PrePromptSuite {
    static async validateAndHydrate(workspacePath, rawPrompt, sessionState, logChannel) {
        logChannel.appendLine(`\n======================================================`);
        logChannel.appendLine(`[BRIDGE PRE-PROMPT SUITE]: Intercepting Task Dispatch`);
        logChannel.appendLine(`======================================================`);

        // 1. One Task Per Turn Rule Verification
        const compoundPatterns = ['and then', 'subsequently', 'also fix'];
        if (compoundPatterns.some(pattern => rawPrompt.toLowerCase().includes(pattern))) {
            vscode.window.showErrorMessage("Bridge Guard: Multiple tasks detected. Split instructions into single tracking items.");
            return null;
        }

        // 2. Automated Git Branching and Issue Association Mapping
        let currentBranch = await Shell.run('git', ['branch', '--show-current'], workspacePath);
        let issueId = (currentBranch.match(/task\/(\d+)-/) || [])[1];

        if (['main', 'master', 'prod'].includes(currentBranch)) {
            logChannel.appendLine(`[GIT ORCHESTRATOR]: Active on protected branch. Diverting workflow to task isolation...`);
            const title = await vscode.window.showInputBox({ prompt: 'Provide a brief title to create a new GitHub Issue tracker:' });
            if (!title) return null;

            const issueUrl = await Shell.run('gh', ['issue', 'create', '--title', title, '--body', 'Automated context tracker.'], workspacePath);
            issueId = issueUrl.split('/').pop();
            currentBranch = `task/${issueId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            
            await Shell.run('git', ['checkout', '-b', currentBranch], workspacePath);
            logChannel.appendLine(`[GIT ORCHESTRATOR]: Root branched cleanly to tracked item -> ${currentBranch}`);
        }

        // 3. Locality of Reference Type Blueprint Siphon (Max 5 Loaded Protection)
        let siblingContext = "";
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const activeDir = path.dirname(activeEditor.document.fileName);
            const patterns = ['types.ts', 'models.py', 'contracts.ts'];
            for (const p of patterns) {
                const fullPath = path.join(activeDir, p);
                if (fs.existsSync(fullPath)) {
                    siblingContext += `\n--- Local Type Contract [${p}] ---\n${fs.readFileSync(fullPath, 'utf-8').substring(0, 1500)}\n`;
                    logChannel.appendLine(`[LOCALITY OF REFERENCE]: Injected schema blueprints from: ${p}`);
                    break;
                }
            }
        }

        // 4. Structural Anti-Drift Refresh Sequence
        sessionState.hops = (sessionState.hops || 0) + 1;
        let antiDriftDirective = "";
        if (sessionState.hops >= 10) {
            sessionState.hops = 0;
            antiDriftDirective = `\n\n[ANTI-DRIFT SYSTEM RE-SYNC]: Keep files modular, under 100 lines, and strictly respect your active feature slice layer.`;
        }

        const compiledPrompt = `[Issue #${issueId}][Branch: ${currentBranch}] Task: ${rawPrompt}\n${siblingContext}${antiDriftDirective}`;
        return { compiledPrompt, issueId, currentBranch };
    }
}

module.exports = PrePromptSuite;
