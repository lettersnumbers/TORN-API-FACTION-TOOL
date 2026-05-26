# Torn API Faction Tool

The **Torn API Faction Tool** is a web-based dashboard designed for players of the text-based MMORPG **Torn City**. It interacts with the Torn API (specifically targeting the newer V2 API) to provide faction leaders and members with detailed insights into their faction's armory, attacks, funds, active/past wars, and members.

This document serves as the primary entry point and indexing hub for human developers and AI coding agents.

---

## 🗺️ Documentation Index

To fully comprehend the application's architecture, past choices, and current objectives, please refer to the following semantic documentation files:

1. **[PROJECT_CONTEXT.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/PROJECT_CONTEXT.md)**: Original high-level summary of the codebase, tech stack, and dual-mode security setup.
2. **[ARCHITECTURE.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/ARCHITECTURE.md)**: Technical specification detailing the code modules, component structure, API proxy, state management, and custom hooks.
3. **[DECISION_LOG.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/DECISION_LOG.md)**: Record of core engineering decisions, technology trade-offs, styling guidelines, and API limitations.
4. **[ROADMAP.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/ROADMAP.md)**: List of pending features, enhancement ideas, security considerations, and future goals.

---

## 🛠️ Core Technology Stack

- **Frontend Core**: React 18 & Vite
- **Routing**: React Router DOM (`v6`)
- **Styling**: Vanilla CSS (no Tailwind/Bootstrap; maintains standard, high-quality, customized dark themes)
- **HTTP client**: Axios
- **Serverless/Proxy**: Vercel Node.js Serverless Functions (`/api/torn-proxy.js`)

---

## 🚀 Setup & Execution

### 1. Installation
Install the necessary package dependencies:
```bash
npm install
```

### 2. Local Development Server
Start Vite's development server locally:
```bash
npm run dev
```
> [!NOTE]
> When running on `localhost`, the application fetches the user's API key directly from `localStorage` to bypass Vercel CLI/serverless proxy requirements.

### 3. Production Build
Prepare the application for production deployment:
```bash
npm run build
```
This command compiles the assets to the `dist` directory. The production build uses the secure proxy endpoints on Vercel (`/api/torn-proxy`) to completely protect the Faction Leader's API Key.

---

## 📦 Directory Structure

- **[/api](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/api)**: Serverless functions for production API proxying.
- **[/src](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src)**: Application source code.
  - **[/src/components](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/components)**: Shared reusable components (e.g., [Layout.jsx](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/components/Layout.jsx)).
  - **[/src/context](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/context)**: Global React state (e.g., [DataContext.jsx](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/context/DataContext.jsx)).
  - **[/src/pages](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/pages)**: Main dashboard page components.
  - **[/src/services](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/services)**: Outgoing network APIs (e.g., [api.js](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/services/api.js)).
