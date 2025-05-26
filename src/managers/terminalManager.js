const vscode = require('vscode');
const os = require('os');

/**
 * Gets or creates the pyCage terminal
 * @returns {vscode.Terminal} The pyCage terminal
 */
function getOrCreateTerminal() {
    try {
        // Find existing pyCage terminal
        const existingTerminal = vscode.window.terminals.find(t => t.name === 'pyCage');
        if (existingTerminal && existingTerminal.exitStatus === undefined) {
            // Double-check that the terminal is actually usable
            try {
                // Test if terminal is still valid by checking its state
                if (existingTerminal.state) {
                    return existingTerminal;
                }
            } catch (testError) {
                console.log('Existing terminal is not usable, creating new one:', testError.message);
            }
        }

        // Create new terminal if none exists or existing one is disposed
        console.log('Creating new pyCage terminal');
        return vscode.window.createTerminal('pyCage');
    } catch (error) {
        console.error('Error in getOrCreateTerminal:', error);
        // Fallback: try to create a terminal with a unique name
        return vscode.window.createTerminal(`pyCage-${Date.now()}`);
    }
}

/**
 * Sets up the terminal environment with correct PATH for uv
 * @param {vscode.Terminal} terminal - Terminal to setup
 * @param {string} uvPath - Path to uv executable
 */
function setupTerminalEnvironment(terminal, uvPath) {
    try {
        // Add common uv installation paths to PATH if needed
        const pathAdditions = [
            os.homedir() + '/.cargo/bin',
            os.homedir() + '/.local/bin',
            '/usr/local/bin',
            '/opt/homebrew/bin'
        ];

        // Only add to PATH if uvPath contains a specific path
        if (uvPath.includes('/') || uvPath.includes('\\')) {
            const uvDir = uvPath.replace(/['"]/g, '').split(/[/\\]/).slice(0, -1).join('/');
            if (uvDir && !pathAdditions.includes(uvDir)) {
                pathAdditions.unshift(uvDir);
            }
        }

        const pathExtension = pathAdditions.join(':');
        terminal.sendText(`export PATH="${pathExtension}:$PATH"`);
        console.log(`Terminal PATH updated with: ${pathExtension}`);
    } catch (error) {
        console.error('Error setting up terminal environment:', error);
    }
}

module.exports = {
    getOrCreateTerminal,
    setupTerminalEnvironment
};