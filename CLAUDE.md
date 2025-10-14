# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Archodex Frontend is a React-based cloud infrastructure visualization dashboard that displays relationships between
cloud resources, environments, and secrets using interactive graph visualizations.

## Commands

### Development

```bash
# Install dependencies
npm install

# Start development server (requires VS Code settings for backend config)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run tests
npm run test
```

### VS Code Development Tasks

The project includes VS Code tasks for different development modes:

- `npm: dev (remote backend)` - Connect to remote Archodex backend (default)
- `npm: dev (local backend)` - Connect to local backend
- `npm: dev (playground)` - Run in demo mode with mock data

To use remote/local backend modes, configure VS Code User Settings:

```json
{ "archodex": { "ARCHODEX_ENV_NAME": "<archodex env name>", "COGNITO_CLIENT_ID": "<cognito client id>" } }
```

## Architecture

### Core Technologies

- **React 19.1.0** with TypeScript
- **Vite** for build tooling
- **React Router 7.6.2** for routing with loader pattern
- **@xyflow/react** for graph visualization
- **elkjs** for automatic graph layout
- **shadcn/ui** components (Radix UI based)
- **Tailwind CSS v4** for styling
- **React Hook Form + Zod** for forms

### Key Architectural Patterns

1. **Multi-tenant SaaS Architecture**
   - Account-based routing: `/accounts/:accountId/*`
   - Authentication via AWS Cognito with WebAuthn support
   - Environment isolation per account

2. **Data Loading Strategy**
   - React Router loaders for data fetching
   - Separate loaders: `accountsLoader`, `queriesLoader`, `settingsLoader`
   - Playground mode with mock data in `src/lib/playgroundData/`

3. **Graph Visualization System**
   - Custom React Flow implementation with ELK layout
   - Resource nodes represent cloud infrastructure
   - Edges show relationships and dependencies
   - Issue highlighting and filtering

4. **Context-Based State Management**
   - `ThemeContext` - Dark/light mode theming
   - `TutorialContext` - User onboarding flow
   - `QueryDataContext` - Query view state management

5. **Component Organization**
   - `src/components/ui/` - shadcn/ui base components
   - `src/components/` - Feature components
   - `src/settings/` - Settings-related components
   - `src/hooks/` - Custom React hooks

### Important Implementation Details

- **Authentication**: Uses AWS Cognito with Passkey/WebAuthn support
- **Graph Layout**: ELK algorithm calculates positions for cloud resources
- **Issue Detection**: Visual indicators for misconfigurations and security issues
- **Environment Filtering**: Toggle visibility of different environments
- **Resource Types**: Supports multiple cloud resource types with custom node components

## Development Guidelines

- TypeScript strict mode is enabled
- Path alias configured: `@/*` maps to `./src/*`
- ESLint configured with React and TypeScript rules
- Vitest framework is used for testing
- Husky Git hooks are set up
- Components follow shadcn/ui patterns (New York style)
- When writing tests:
  - Do not mock any functions other than async functions that persist data to the backend
  - You must not define any literal string IDs (e.g. node IDs or edge IDs) in tests. Where you need to use a string ID,
    you must use the `nodeIdFromResourceId()` or `edgeIdFromResourceId()` utility functions.
    - When you use the same Resource ID more than once in a test file, you must define a constant at the top of the file
      for it and use it throughout the file.
  - When checking tests, you can use one of the following commands:
    - To run all tests: npx vitest run
    - To run tests from a specific test file: npx vitest run <filename>
    - To run a specific test: npx vitest run <filename> --testNamePattern="<test name>"
  - If you believe a test shows a problem in the implementation code, e.g. the implementation code is mutating original
    state when it shouldn't be, stop and ask me what to do about it.
    - You may modify the implementation code if I give you approval to do so, but you must ask every time.
