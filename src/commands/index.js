/**
 * Central command registration module
 * This file imports and re-exports all command registration functions
 * from the modularized command files for cleaner organization.
 */

const { registerPipInstaller } = require('./pipCommands');
const { 
    registerUvInstaller, 
    registerUvInitCommand, 
    registerUvAddPackageCommand 
} = require('./uvCommands');
const { 
    registerDebugCommand, 
    registerRequirementsCommand, 
    registerInstallFromRequirementsCommand,
    registerTransferToUvCommand
} = require('./projectCommands');

/**
 * Register all commands for the extension
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @param {Array} names - Array of package names from PyPI
 * @param {Object} osInfo - Operating system information
 */
function registerAllCommands(context, names, osInfo) {
    // Package installation commands
    registerPipInstaller(context, names);
    registerUvInstaller(context, names, osInfo);
    
    // UV native commands
    registerUvInitCommand(context);
    registerUvAddPackageCommand(context, names);
    
    // Project management commands
    registerDebugCommand(context);
    registerRequirementsCommand(context);
    registerInstallFromRequirementsCommand(context);
    registerTransferToUvCommand(context);
}

module.exports = {
    // Main registration function
    registerAllCommands,
    
    // Individual command registration functions (for selective use)
    registerPipInstaller,
    registerUvInstaller,
    registerUvInitCommand,
    registerUvAddPackageCommand,
    registerDebugCommand,
    registerRequirementsCommand,
    registerInstallFromRequirementsCommand,
    registerTransferToUvCommand
};
