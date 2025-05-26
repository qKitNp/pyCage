const vscode = require('vscode');
const fs = require('fs');
const { checkUvInstalled, installUv } = require('./uvManager');
const { getOrCreateTerminal } = require('./terminalManager');
const { createVenvIfNeeded } = require('./venvManager');

/**
 * Sets up uv installation asynchronously without blocking command registration
 * @param {Object} osInfo - Operating system information
 * @returns {Promise<boolean>} - Promise that resolves to true if setup succeeded
 */
async function setupUvAsync(osInfo) {
    try {
        let terminal = getOrCreateTerminal();
        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
        const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
        const venvExists = fs.existsSync(venvPath.fsPath);

        // Check if uv is already installed
        const uvInstalled = await checkUvInstalled();

        if (!uvInstalled) {
            console.log('Installing uv...');
            vscode.window.showInformationMessage(`pyCage detected ${osInfo.readable} - installing uv...`);

            // Install uv and wait for actual completion
            const installationSuccess = await installUv(osInfo);

            if (installationSuccess) {
                console.log('uv installation completed, restarting terminal...');

                // Safely dispose old terminal and create new one to refresh PATH
                try {
                    if (terminal && terminal.exitStatus === undefined) {
                        terminal.dispose();
                    }
                } catch (disposeError) {
                    console.log('Terminal already disposed or invalid:', disposeError.message);
                }

                // Wait a moment for disposal to complete, then create new terminal
                await new Promise(resolve => setTimeout(resolve, 500));
                terminal = getOrCreateTerminal();

                // Verify installation worked by checking version again
                const uvNowInstalled = await checkUvInstalled();
                if (uvNowInstalled) {
                    vscode.window.showInformationMessage('uv installed successfully! Ready to use.');

                    await createVenvIfNeeded(terminal, venvExists);
                    return true;
                } else {
                    vscode.window.showWarningMessage('uv installation completed but uv command not found. You may need to restart VS Code.');
                    return false;
                }
            } else {
                vscode.window.showErrorMessage('Failed to install uv. Please install manually or check your internet connection.');
                return false;
            }

        } else {
            console.log('uv is already installed, skipping installation');
            vscode.window.showInformationMessage(`pyCage detected ${osInfo.readable} - uv already installed`);

            await createVenvIfNeeded(terminal, venvExists);
            return true;
        }
    } catch (error) {
        console.error('Error during uv setup:', error);
        vscode.window.showErrorMessage(`Error setting up uv: ${error.message}`);
        return false;
    }
}

module.exports = {
    setupUvAsync
};