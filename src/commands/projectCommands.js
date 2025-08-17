const vscode = require('vscode');
const fs = require('fs');
const CommandBase = require('../utils/commandBase');
const { getOperatingSystem } = require('../utils/system');

/**
 * Registers the debug interpreter command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerDebugCommand(context) {
    let debugCommand = vscode.commands.registerCommand('py-cage.debugInterpreter',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found');
            if (!workspaceFolder) return;

            const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
            const osInfo = getOperatingSystem();
            const pythonPath = osInfo.isWindows
                ? `${venvPath.fsPath}\\Scripts\\python.exe`
                : `${venvPath.fsPath}/bin/python`;

            // Current configuration
            const config = vscode.workspace.getConfiguration('python');
            const currentInterpreter = config.get('defaultInterpreterPath');
            const currentPythonPath = config.get('pythonPath');

            const debugInfo = [
                `📁 Workspace: ${workspaceFolder.uri.fsPath}`,
                `🐍 OS: ${osInfo.readable} (${osInfo.platform})`,
                `📂 .venv exists: ${fs.existsSync(venvPath.fsPath)}`,
                `🐍 Python executable exists: ${fs.existsSync(pythonPath)}`,
                `📍 Expected Python path: ${pythonPath}`,
                `⚙️ Current defaultInterpreterPath: ${currentInterpreter || 'not set'}`,
                `⚙️ Current pythonPath: ${currentPythonPath || 'not set'}`,
            ];

            if (fs.existsSync(venvPath.fsPath)) {
                try {
                    const venvContents = fs.readdirSync(venvPath.fsPath);
                    debugInfo.push(`📂 .venv contents: ${venvContents.join(', ')}`);

                    const scriptsBinPath = osInfo.isWindows 
                        ? `${venvPath.fsPath}\\Scripts`
                        : `${venvPath.fsPath}/bin`;
                    
                    if (fs.existsSync(scriptsBinPath)) {
                        const contents = fs.readdirSync(scriptsBinPath);
                        const dirName = osInfo.isWindows ? 'Scripts' : 'bin';
                        debugInfo.push(`📂 ${dirName} contents: ${contents.join(', ')}`);
                    }
                } catch (error) {
                    debugInfo.push(`❌ Error reading .venv contents: ${error.message}`);
                }
            }

            console.log('=== PYTHON INTERPRETER DEBUG INFO ===');
            debugInfo.forEach(info => console.log(info));

            // Show status if .venv exists
            if (fs.existsSync(venvPath.fsPath) && fs.existsSync(pythonPath)) {
                debugInfo.push('✅ Virtual environment is ready to use');
            }

            vscode.window.showInformationMessage('Debug info logged to console. Check VS Code Developer Tools → Console tab.');
        });

    context.subscriptions.push(debugCommand);
}

/**
 * Registers the requirements.txt generator command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerRequirementsCommand(context) {
    let requirementsCommand = vscode.commands.registerCommand('py-cage.makeRequirements',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to generate requirements.txt');
            if (!workspaceFolder) return;

            if (!(await CommandBase.checkUvAvailable())) return;

            console.log('Generating requirements.txt...');
            vscode.window.showInformationMessage('📝 Generating requirements.txt...');

            await CommandBase.executeUvCommand(
                'pip freeze > requirements.txt',
                '✅ requirements.txt generated! Check your workspace root.',
                '✓ requirements.txt generated'
            );
        });

    context.subscriptions.push(requirementsCommand);
}

/**
 * Registers the requirements.txt installer command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerInstallFromRequirementsCommand(context) {
    let installFromRequirementsCommand = vscode.commands.registerCommand('py-cage.installFromRequirements',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to install from requirements.txt');
            if (!workspaceFolder) return;

            // Check if requirements.txt exists
            if (!CommandBase.fileExistsInWorkspace(workspaceFolder, 'requirements.txt')) {
                vscode.window.showWarningMessage('❌ requirements.txt not found in the workspace root. Please create one first.');
                return;
            }

            if (!(await CommandBase.checkUvAvailable())) return;

            console.log('Installing packages from requirements.txt...');
            vscode.window.showInformationMessage('📦 Installing packages from requirements.txt...');

            await CommandBase.executeUvCommand(
                'pip install -r requirements.txt',
                '✅ Installing packages from requirements.txt. Check terminal for progress.',
                '✓ All packages from requirements.txt installed successfully'
            );
        });

    context.subscriptions.push(installFromRequirementsCommand);
}

/**
 * Registers the transfer existing project to UV command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerTransferToUvCommand(context) {
    let transferToUvCommand = vscode.commands.registerCommand('py-cage.transferToUv',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to transfer to UV.');
            if (!workspaceFolder) return;

            if (!(await CommandBase.checkUvAvailable())) return;

            // Check if pyproject.toml already exists
            if (CommandBase.fileExistsInWorkspace(workspaceFolder, 'pyproject.toml')) {
                const shouldContinue = await CommandBase.showConfirmation(
                    'pyproject.toml already exists. This appears to be a UV project already. Continue with transfer anyway?'
                );
                if (!shouldContinue) return;
            }

            // Show confirmation dialog explaining the process
            const confirmed = await vscode.window.showWarningMessage(
                '🔄 This will:\n' +
                '1. Export current packages with pip freeze\n' +
                '2. Initialize UV project (uv init)\n' +
                '3. Add all packages to UV project\n' +
                '4. Clean up temporary files\n\n' +
                'Continue with transfer?',
                'Transfer to UV',
                'Cancel'
            );

            if (confirmed !== 'Transfer to UV') return;

            try {
                console.log('Starting transfer to UV...');
                vscode.window.showInformationMessage('🚀 Starting transfer to UV project...');

                const terminal = CommandBase.getOrCreateTerminal ? CommandBase.getOrCreateTerminal() : require('../managers/terminalManager').getOrCreateTerminal();
                const uvCommand = await require('../managers/uvManager').getUvCommand();
                require('../managers/terminalManager').setupTerminalEnvironment(terminal, uvCommand);

                // Step 1: Export current packages to temporary requirements file
                vscode.window.showInformationMessage('📋 Step 1/4: Exporting current packages...');
                terminal.sendText('pip freeze > requirements-temp.txt && echo "✓ Current packages exported to requirements-temp.txt"');
                
                // Wait a moment for the freeze command to complete
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Step 2: Initialize UV project
                vscode.window.showInformationMessage('🏗️ Step 2/4: Initializing UV project...');
                terminal.sendText(`${uvCommand} init && echo "✓ UV project initialized"`);
                
                // Wait for init to complete
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Step 3: Add packages from requirements file
                vscode.window.showInformationMessage('📦 Step 3/4: Adding packages to UV project...');
                terminal.sendText(`${uvCommand} add -r requirements-temp.txt && echo "✓ Packages added to UV project"`);
                
                // Wait for packages to be added
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Step 4: Clean up temporary file
                vscode.window.showInformationMessage('🧹 Step 4/4: Cleaning up...');
                const osInfo = require('../utils/system').getOperatingSystem();
                const deleteCommand = osInfo.isWindows ? 'del requirements-temp.txt' : 'rm requirements-temp.txt';
                terminal.sendText(`${deleteCommand} && echo "✓ Transfer to UV completed successfully!"`);

                terminal.show();

                // Show success message
                setTimeout(() => {
                    vscode.window.showInformationMessage(
                        '✅ Project successfully transferred to UV!\n\n' +
                        '📁 Created: pyproject.toml, .python-version\n' +
                        '📦 Added: All existing packages\n' +
                        '🔧 Ready: Use "pyCage: Add Package with UV" for new packages'
                    );
                }, 8000);

                console.log('✓ Transfer to UV completed');

            } catch (error) {
                console.error('❌ Error transferring to UV:', error);
                vscode.window.showErrorMessage(`❌ Failed to transfer to UV: ${error.message}`);
            }
        });

    context.subscriptions.push(transferToUvCommand);
}

module.exports = {
    registerDebugCommand,
    registerRequirementsCommand,
    registerInstallFromRequirementsCommand,
    registerTransferToUvCommand
};
