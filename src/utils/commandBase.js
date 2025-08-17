const vscode = require('vscode');
const fs = require('fs');
const { checkUvInstalled, getUvCommand } = require('../managers/uvManager');
const { getOrCreateTerminal, setupTerminalEnvironment } = require('../managers/terminalManager');

/**
 * Common validation and setup for commands
 */
class CommandBase {
    /**
     * Check if a workspace folder is available
     * @param {string} errorMessage - Custom error message if no workspace found
     * @returns {Object|null} Workspace folder or null if not found
     */
    static checkWorkspaceFolder(errorMessage = '❌ No workspace folder found. Please open a folder.') {
        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
        if (!workspaceFolder) {
            vscode.window.showErrorMessage(errorMessage);
            return null;
        }
        return workspaceFolder;
    }

    /**
     * Check if UV is installed and show error if not
     * @returns {Promise<boolean>} True if UV is available
     */
    static async checkUvAvailable() {
        const uvAvailable = await checkUvInstalled();
        if (!uvAvailable) {
            vscode.window.showErrorMessage('❌ uv is not installed. Please install uv first using the other pyCage commands.');
            return false;
        }
        return true;
    }

    /**
     * Check if package list is available
     * @param {Array} names - Package names array
     * @returns {boolean} True if package list is available
     */
    static checkPackageListAvailable(names) {
        if (!names || names.length === 0) {
            vscode.window.showErrorMessage('Package list not available. Please check your internet connection and try again.');
            return false;
        }
        return true;
    }

    /**
     * Check if a file exists in the workspace
     * @param {Object} workspaceFolder - VS Code workspace folder
     * @param {string} fileName - Name of the file to check
     * @returns {boolean} True if file exists
     */
    static fileExistsInWorkspace(workspaceFolder, fileName) {
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        return fs.existsSync(filePath.fsPath);
    }

    /**
     * Get file path in workspace
     * @param {Object} workspaceFolder - VS Code workspace folder
     * @param {string} fileName - Name of the file
     * @returns {string} Full file path
     */
    static getWorkspaceFilePath(workspaceFolder, fileName) {
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        return filePath.fsPath;
    }

    /**
     * Execute a UV command in terminal
     * @param {string} command - The UV command to execute
     * @param {string} successMessage - Message to show on success
     * @param {string} terminalEcho - Echo message for terminal
     * @returns {Promise<void>}
     */
    static async executeUvCommand(command, successMessage, terminalEcho = null) {
        try {
            const terminal = getOrCreateTerminal();
            const uvCommand = await getUvCommand();
            setupTerminalEnvironment(terminal, uvCommand);
            
            const fullCommand = terminalEcho 
                ? `${uvCommand} ${command} && echo "${terminalEcho}"`
                : `${uvCommand} ${command}`;
            
            terminal.sendText(fullCommand);
            terminal.show();
            
            if (successMessage) {
                vscode.window.showInformationMessage(successMessage);
            }
        } catch (error) {
            console.error(`❌ Error executing UV command: ${command}`, error);
            vscode.window.showErrorMessage(`❌ Failed to execute command: ${error.message}`);
            throw error;
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} confirmText - Text for confirm button
     * @param {string} cancelText - Text for cancel button
     * @returns {Promise<boolean>} True if user confirmed
     */
    static async showConfirmation(message, confirmText = 'Continue', cancelText = 'Cancel') {
        const choice = await vscode.window.showWarningMessage(message, confirmText, cancelText);
        return choice === confirmText;
    }

    /**
     * Show dependency type selection
     * @returns {Promise<Object|null>} Selected dependency type or null if cancelled
     */
    static async showDependencyTypeSelection() {
        return await vscode.window.showQuickPick(
            [
                { label: 'Production Dependency', description: 'Add to main dependencies', value: '' },
                { label: 'Development Dependency', description: 'Add with --dev flag', value: '--dev' }
            ],
            {
                placeHolder: 'Select dependency type'
            }
        );
    }
}

module.exports = CommandBase;
