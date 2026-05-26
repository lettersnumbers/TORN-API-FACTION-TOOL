# TORN API FACTION TOOL - Project Context

This document provides context for AI assistants (like Claude Sonnet, Claude Opus, and others) to understand the architecture, purpose, and tech stack of this project.

## 📌 Project Overview
The **Torn API Faction Tool** is a web-based dashboard designed for players of the text-based RPG **Torn City**. It interacts with the Torn API (specifically the newer V2 API) to provide faction leaders and members with detailed insights into their faction's armory, attacks, funds, active/past wars, and members.

## 🛠️ Tech Stack
- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router DOM (`v6`)
- **Styling**: Vanilla CSS (`index.css`, component-specific CSS)
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Deployment & Backend**: Vercel (using Vercel Serverless Functions for API proxying)

## 🏗️ Architecture & Security
To securely handle sensitive Torn API keys (especially the Faction Leader's key), the app uses a dual-mode API service (`src/services/api.js`):

1. **Local Development Mode**:
   - When running on `localhost`, the app fetches a user-provided API key from `localStorage`.
   - Direct requests are made to `https://api.torn.com/v2/...`.
   - This facilitates rapid development and Hot Module Replacement (HMR) without needing the Vercel CLI daemon running locally.

2. **Production Mode (Vercel Proxy)**:
   - In production, the client-side app **never** sees or stores the Faction Leader's API key.
   - Requests are sent to the local serverless endpoint: `/api/torn-proxy`.
   - **`api/torn-proxy.js`**: A Vercel Node.js Serverless Function that intercepts the request, appends the secure `TORN_FACTION_KEY` from Vercel Environment Variables, and forwards the request to the Torn API.
   - **Security**: The proxy explicitly restricts requests to only `/faction` and `/v2/faction` endpoints to prevent malicious actors from querying arbitrary user endpoints using the leader's key.

## 📂 Project Structure
- `/api`: Contains Vercel serverless functions (e.g., `torn-proxy.js`).
- `/src/services/api.js`: The core API fetching logic, handling the split between local and proxy requests.
- `/src/pages/`: Contains the main route views (e.g., `FactionArmory.jsx`, `FactionWarRoom.jsx`, `FactionFunds.jsx`).
- `/src/components/`: Reusable UI components (e.g., `Layout.jsx`, `ExpandedMemberRow.jsx`).
- `/src/context/`: React Context providers for global state management.

## 🎨 Design Philosophy
- **Aesthetics**: The application aims for a premium, dynamic, and modern design. It utilizes dark modes, smooth gradients, glassmorphism, and micro-animations to create a "wow" factor, moving away from generic, basic UI layouts.
- **Responsiveness**: The UI should adapt smoothly to different screen sizes.

## 🤖 AI Guidelines for this Project
When writing or modifying code for this project:
1. **API Endpoints**: Always use the established `fetchFactionCore` wrapper in `src/services/api.js` when adding new faction data fetches. Do not bypass the proxy logic.
2. **Styling**: Stick to Vanilla CSS. Maintain the high-quality, modern aesthetic using CSS variables (defined in `index.css`), hover effects, and transitions. Avoid inline styles where possible.
3. **Components**: Keep React components modular and functional. Use modern React hooks (`useState`, `useEffect`, `useMemo`).
4. **Vercel Limits**: Remember that `torn-proxy.js` runs in a serverless environment with execution time limits. Keep the proxy logic lightweight and focused purely on forwarding requests securely.

## 📚 System Documentation References
Refer to these additional documents for design and architectural specifications:
- **[README.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/README.md)**: Main landing portal and setup configurations.
- **[ARCHITECTURE.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/ARCHITECTURE.md)**: System modules, data contexts, dynamic accents, and serverless proxy logic.
- **[DECISION_LOG.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/DECISION_LOG.md)**: Technology choice explanations, CSS variables, and Torn V1 vs V2 API selection compromises.
- **[ROADMAP.md](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/ROADMAP.md)**: Planned features, security goals, and API rate-limiting rules.
