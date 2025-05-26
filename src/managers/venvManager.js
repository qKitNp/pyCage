const vscode = require('vscode');
const fs = require('fs');
const { getOperatingSystem } = require('../utils/system');
const { getUvCommand } = require('./uvManager');
const { getOrCreateTerminal, setupTerminalEnvironment } = require('./terminalManager');

// Global state to track venv creation
let venvCreationInProgress = false;

/**
 * Creates virtual environment if needed, with duplicate prevention
 * @param {vscode.Terminal} terminal - Terminal to use for venv creation
 * @param {boolean} venvExists - Whether .venv already exists
 */
async function createVenvIfNeeded(terminal, venvExists) {
    if (venvExists) {
        console.log('.venv already exists, skipping creation');

        // Activate the existing virtual environment in terminal
        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
        if (workspaceFolder) {
            console.log('Activating existing virtual environment in terminal...');
            const osInfo = getOperatingSystem();
            let activationCommand;

            if (osInfo.isWindows) {
                activationCommand = '.venv\\Scripts\\activate';
            } else {
                // Linux or macOS
                activationCommand = 'source .venv/bin/activate';
            }

            console.log(`Executing activation command: ${activationCommand}`);
            terminal.sendText(`${activationCommand} && echo "✓ Virtual environment activated"`);
            console.log('✓ Existing virtual environment activated in terminal');

            vscode.window.showInformationMessage('🐍 Virtual environment activated!');
        }
        return;
    }

    if (venvCreationInProgress) {
        console.log('venv creation already in progress, skipping duplicate call');
        return;
    }

    try {
        venvCreationInProgress = true;
        console.log('Creating virtual environment...');

        // Double-check that .venv doesn't exist (race condition protection)
        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
        if (!workspaceFolder) {
            console.log('❌ No workspace folder found, cannot create virtual environment');
            vscode.window.showErrorMessage('❌ No workspace folder found. Please open a folder to create a virtual environment.');
            return;
        }

        const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
        if (fs.existsSync(venvPath.fsPath)) {
            console.log('.venv was created by another process, skipping');
            return;
        }

        // Get the correct uv command path
        const uvCommand = await getUvCommand();
        setupTerminalEnvironment(terminal, uvCommand);
        terminal.sendText(`${uvCommand} venv`);
        terminal.show();

        // Wait for virtual environment to be created and Python executable to be available
        console.log('Waiting for virtual environment creation...');

        let venvCreated = false;
        let pythonExists = false;
        const maxAttempts = 15; // 15 seconds total wait time

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

            if (workspaceFolder) {
                const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
                venvCreated = fs.existsSync(venvPath.fsPath);

                if (venvCreated) {
                    // Check if Python executable exists
                    const osInfo = getOperatingSystem();
                    const pythonPath = osInfo.isWindows
                        ? `${venvPath.fsPath}\\Scripts\\python.exe`
                        : `${venvPath.fsPath}/bin/python`;
                    pythonExists = fs.existsSync(pythonPath);

                    if (pythonExists) {
                        console.log(`✓ Virtual environment ready after ${attempt + 1} seconds`);
                        break;
                    } else {
                        console.log(`Virtual environment directory exists but Python executable not ready yet (attempt ${attempt + 1}/${maxAttempts})`);
                    }
                } else {
                    console.log(`Waiting for .venv directory to be created (attempt ${attempt + 1}/${maxAttempts})`);
                }
            }
        }

        if (venvCreated && pythonExists) {
            console.log('✓ Virtual environment creation completed successfully');

            // Activate the virtual environment in the terminal
            if (workspaceFolder) {
                console.log('Activating virtual environment in terminal...');
                const osInfo = getOperatingSystem();
                let activationCommand;

                if (osInfo.isWindows) {
                    activationCommand = '.venv\\Scripts\\activate';
                } else {
                    // Linux or macOS
                    activationCommand = 'source .venv/bin/activate';
                }

                console.log(`Executing activation command: ${activationCommand}`);
                terminal.sendText(`${activationCommand} && echo "✓ Virtual environment activated"`);
                console.log('✓ Virtual environment activated in terminal');

                vscode.window.showInformationMessage('🐍 Virtual environment created and activated!');
            }
        } else if (venvCreated && !pythonExists) {
            console.log('⚠️ Virtual environment directory created but Python executable not found');
            vscode.window.showWarningMessage('⚠️ Virtual environment created but Python executable not found. Please check if uv venv completed successfully.');
        } else {
            console.log('❌ Virtual environment creation may have failed - directory not found after waiting');
            vscode.window.showErrorMessage('❌ Virtual environment creation failed. Please check the terminal for errors.');
        }

    } catch (error) {
        console.error('Error creating venv:', error);
        // Try with a fresh terminal if the current one has issues
        try {
            const freshTerminal = getOrCreateTerminal();
            const uvCommand = await getUvCommand();
            setupTerminalEnvironment(freshTerminal, uvCommand);
            freshTerminal.sendText(`${uvCommand} venv`);
            freshTerminal.show();
        } catch (fallbackError) {
            console.error('Failed to create venv with fallback terminal:', fallbackError);
        }
    } finally {
        venvCreationInProgress = false;
    }
}

module.exports = {
    createVenvIfNeeded
};