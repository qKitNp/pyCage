# pyCage Extension - Modular Structure

This document explains the modular organization of the pyCage VS Code extension for better readability and maintainability.

## Directory Structure

```
src/
├── utils/
│   └── system.js              # Operating system detection utilities
├── managers/
│   ├── uvManager.js           # UV package manager installation and management
│   ├── terminalManager.js     # Terminal creation and environment setup
│   ├── venvManager.js         # Virtual environment creation and management
│   └── packageManager.js      # Package management orchestration
└── commands/
    └── commandHandlers.js     # VS Code command implementations
```

## Module Descriptions

### `utils/system.js`
- **Purpose**: System-related utility functions
- **Functions**:
  - `getOperatingSystem()`: Detects OS and returns platform information

### `managers/uvManager.js`
- **Purpose**: UV package manager installation and management
- **Functions**:
  - `checkUvInstalled()`: Checks if UV is already installed
  - `installUv()`: Installs UV using the appropriate method for the OS
  - `getUvCommand()`: Gets the correct UV command path

### `managers/terminalManager.js`
- **Purpose**: Terminal creation and environment setup
- **Functions**:
  - `getOrCreateTerminal()`: Gets or creates the pyCage terminal
  - `setupTerminalEnvironment()`: Sets up terminal environment with correct PATH for UV

### `managers/venvManager.js`
- **Purpose**: Virtual environment creation and management
- **Functions**:
  - `createVenvIfNeeded()`: Creates virtual environment if needed with duplicate prevention

### `managers/packageManager.js`
- **Purpose**: High-level package management orchestration
- **Functions**:
  - `setupUvAsync()`: Sets up UV installation asynchronously without blocking command registration

### `commands/commandHandlers.js`
- **Purpose**: VS Code command implementations
- **Functions**:
  - `registerPipInstaller()`: Registers the pip global package installer command
  - `registerUvInstaller()`: Registers the UV local package installer command
  - `registerDebugCommand()`: Registers the debug interpreter command
  - `registerRequirementsCommand()`: Registers the requirements.txt generator command

## Main Extension File

The main `extension.js` file now only contains:
- Import statements for all modular functions
- The `activate()` function that orchestrates the extension startup
- The `deactivate()` function (currently empty)

## Benefits of This Structure

1. **Better Readability**: Each file has a single responsibility and focused functionality
2. **Easier Maintenance**: Bug fixes and feature additions are localized to specific modules
3. **Improved Testing**: Individual modules can be tested in isolation
4. **Reduced Coupling**: Clear separation of concerns between different functional areas
5. **Reusability**: Functions can be easily reused across different parts of the extension

## Usage

All modules are imported and used in the main `extension.js` file. The modular structure is transparent to end users - the extension functionality remains exactly the same.