const vscode = require('vscode');
const os = require('os');
const { exec } = require('child_process');

/**
 * Checks if uv is already installed by running uv --version
 * @returns {Promise<boolean>} - Promise that resolves to true if uv is installed
 */
async function checkUvInstalled() {
    return new Promise((resolve) => {
        // First try the simple command
        exec('uv --version', (error, stdout, stderr) => {
            if (error) {
                console.log('uv not found in PATH, checking common installation locations...');

                // Check common installation paths for macOS/Linux
                const commonPaths = [
                    os.homedir() + '/.cargo/bin/uv',
                    os.homedir() + '/.local/bin/uv',
                    '/usr/local/bin/uv',
                    '/opt/homebrew/bin/uv'  // For Apple Silicon Homebrew
                ];

                let foundPath = null;
                let checkedPaths = 0;

                commonPaths.forEach(path => {
                    exec(`"${path}" --version`, (pathError, pathStdout, pathStderr) => {
                        checkedPaths++;

                        if (!pathError && !foundPath) {
                            foundPath = path;
                            console.log(`uv found at: ${path}, version: ${pathStdout.trim()}`);
                            resolve(true);
                        } else if (checkedPaths === commonPaths.length && !foundPath) {
                            console.log('uv not found in common locations, will install it');
                            resolve(false);
                        }
                    });
                });
            } else {
                console.log(`uv is already installed: ${stdout.trim()}`);
                resolve(true);
            }
        });
    });
}

/**
 * Installs uv using the appropriate method for the OS
 * @param {Object} osInfo - Operating system information
 * @returns {Promise<boolean>} - Promise that resolves to true if installation succeeded
 */
async function installUv(osInfo) {
    return new Promise((resolve) => {
        let installCommand;

        if (osInfo.isWindows) {
            // Windows: Use PowerShell to install uv
            installCommand = 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"';
        } else if (osInfo.isMacOS || osInfo.isLinux) {
            // macOS/Linux: Use curl to install uv
            installCommand = 'curl -LsSf https://astral.sh/uv/install.sh | sh';
        } else {
            console.error('Unsupported operating system for uv installation');
            resolve(false);
            return;
        }

        console.log(`Executing installation command: ${installCommand}`);

        exec(installCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('uv installation failed:', error);
                console.error('stderr:', stderr);
                vscode.window.showErrorMessage(`Failed to install uv: ${error.message}`);
                resolve(false);
            } else {
                console.log('uv installation completed successfully');
                console.log('stdout:', stdout);
                if (stderr) {
                    console.log('stderr:', stderr);
                }
                resolve(true);
            }
        });
    });
}

/**
 * Gets the correct uv command, checking common installation paths
 * @returns {Promise<string>} - Promise that resolves to the uv command path
 */
async function getUvCommand() {
    return new Promise((resolve) => {
        // First try the simple command
        exec('uv --version', (error, stdout, stderr) => {
            if (!error) {
                resolve('uv');
                return;
            }

            // Check common installation paths for macOS/Linux
            const commonPaths = [
                os.homedir() + '/.cargo/bin/uv',
                os.homedir() + '/.local/bin/uv',
                '/usr/local/bin/uv',
                '/opt/homebrew/bin/uv'  // For Apple Silicon Homebrew
            ];

            let foundPath = null;
            let checkedPaths = 0;

            commonPaths.forEach(path => {
                exec(`"${path}" --version`, (pathError, pathStdout, pathStderr) => {
                    checkedPaths++;

                    if (!pathError && !foundPath) {
                        foundPath = path;
                        resolve(`"${path}"`);
                    } else if (checkedPaths === commonPaths.length && !foundPath) {
                        resolve('uv'); // Fallback to simple command
                    }
                });
            });
        });
    });
}

module.exports = {
    checkUvInstalled,
    installUv,
    getUvCommand
};