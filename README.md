# Archodex Frontend (Dashboard)

## Getting started with a local dev environment
1. Open this repo in VS Code
1. Run `npm install`
1. Run the `npm: dev (archodex.com accounts backend)` task
    1. Launch Command Pallete (`Cmd + Shift + P`)
    1. Select `Tasks: Run Task`
    1. Select `npm: dev (archodex.com accounts backend)`

## Running a local dev environment against a local accounts backend
> [!NOTE]
> This is primarily used by Archodex internal developers while developing archodex.com-specific functionality. It is unlikely you will need to follow these instructions.

1. Copy the `.vscode/.env.template` file to `.vscode/.env`
1. Update the values of the environment variables in the `.vscode/.env` file to match your environment
1. Run the `npm: dev (local accounts backend)` task in VS Code