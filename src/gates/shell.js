/**
 * @file shell.js
 * @description Asynchronous POSIX process spawning optimized for Termux/Linux environments.
 * Ensures long-running Kilo CLI loops do not freeze the VS Code / Code-Server UI thread.
 */

const { spawn } = require('child_process');

class Shell {
    /**
     * Executes a terminal command asynchronously inside Termux.
     * @param {string} command - The core binary to execute (e.g., 'git', 'gh', 'pkg').
     * @param {string[]} args - Arguments passed to the executable.
     * @param {string} cwd - Current working directory context.
     * @returns {Promise<string>} - Cleaned stdout string stream response.
     */
    static run(command, args = [], cwd = process.cwd()) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, { 
                cwd, 
                env: process.env,
                shell: true // Leverages Termux's local bash environment natively
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => stdout += data.toString());
            child.stderr.on('data', (data) => stderr += data.toString());

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(stderr.trim() || `Execution failed with exit code ${code}`));
                }
            });
        });
    }
}

module.exports = Shell;
