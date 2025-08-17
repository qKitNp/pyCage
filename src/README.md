# pyCage Source Code Structure

This directory contains the source code for the pyCage VS Code extension, organized in a modular architecture for better maintainability and readability.

## Directory Structure

```
src/
├── commands/
│   ├── index.js               # Central command registry
│   ├── pipCommands.js         # Pip-related commands
│   ├── uvCommands.js          # UV package manager commands
│   └── projectCommands.js     # Project management commands
├── managers/
│   ├── packageManager.js      # Package installation management
│   ├── terminalManager.js     # Terminal operations
│   ├── uvManager.js           # UV installation and management
│   └── venvManager.js         # Virtual environment management
└── utils/
    ├── commandBase.js         # Common command patterns and validation
    ├── packageSearch.js       # Package search and selection utilities
    └── system.js              # Operating system detection utilities
```

## Modular Architecture

### Commands Layer (`commands/`)

**index.js** - Central command registry

- Imports and exports all command registration functions
- Provides `registerAllCommands()` for easy setup
- Maintains clean separation between extension entry point and commands

**pipCommands.js** - Pip package manager commands

- `registerPipInstaller()` - Global pip package installation

**uvCommands.js** - UV package manager commands

- `registerUvInstaller()` - UV pip-compatible package installation
- `registerUvInitCommand()` - UV project initialization (`uv init`)
- `registerUvAddPackageCommand()` - Native UV package addition (`uv add`)

**projectCommands.js** - Project management commands

- `registerDebugCommand()` - Python interpreter debugging
- `registerRequirementsCommand()` - Requirements.txt generation
- `registerInstallFromRequirementsCommand()` - Install from requirements.txt

### Utilities Layer (`utils/`)

**commandBase.js** - Common command patterns

- `CommandBase` class with static methods for common validations
- Workspace folder checks, UV availability checks
- Unified terminal command execution
- Common UI patterns (confirmations, dependency type selection)

**packageSearch.js** - Package search and selection

- Advanced package search with ranking algorithms
- Weighted scoring (download count + keyword similarity)
- Interactive quick pick interface with real-time filtering
- Package name extraction utilities

**system.js** - Operating system utilities

- Cross-platform OS detection
- Platform-specific path handling

### Managers Layer (`managers/`)

**uvManager.js** - UV package manager integration

- UV installation detection and verification
- Cross-platform UV command path resolution
- UV installation procedures

**terminalManager.js** - Terminal operations

- VS Code integrated terminal management
- Terminal creation, reuse, and environment setup
- Cross-platform terminal command execution

**packageManager.js** - Package installation management

- High-level package manager setup and initialization
- Asynchronous UV setup procedures

**venvManager.js** - Virtual environment management

- Virtual environment creation and detection
- Python interpreter path resolution

## Design Principles

1. **Separation of Concerns**: Each file has a single, well-defined responsibility
2. **Reusability**: Common patterns extracted into utility classes/functions
3. **Maintainability**: Clear module boundaries make the code easier to modify
4. **Testability**: Modular structure allows for easier unit testing
5. **Consistency**: Standardized patterns across all command implementations

## Adding New Commands

To add a new command:

1. Determine the appropriate command file (pip, uv, or project)
2. Use `CommandBase` utilities for common validation patterns
3. Follow existing naming conventions and error handling patterns
4. Export the registration function from the appropriate command file
5. Add the import/export to `commands/index.js`

## Code Quality Features

- **Error Handling**: Consistent error messaging and user feedback
- **User Experience**: Progressive disclosure and helpful confirmation dialogs
- **Performance**: Efficient package search with smart ranking algorithms
- **Cross-Platform**: Full Windows, macOS, and Linux support

## Refactoring Benefits

The modular refactoring provides:

1. **📖 Better Readability**: Each file focuses on a specific domain
2. **🔧 Easier Maintenance**: Changes are localized to specific modules
3. **🧪 Improved Testing**: Individual modules can be tested in isolation
4. **🔗 Reduced Coupling**: Clear interfaces between modules
5. **♻️ Reusability**: Common patterns are extracted and shared
6. **📈 Scalability**: New features can be added without affecting existing code

## Migration Summary

- **Before**: Single 532-line `commandHandlers.js` file
- **After**: 7 focused files with clear responsibilities
- **Reduced complexity**: Each file is now under 150 lines
- **Improved organization**: Logical grouping by functionality
- **Enhanced maintainability**: Clear separation of concerns
