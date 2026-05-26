# Engineering & Architectural Decision Log

This log chronicles key design decisions, technology selections, and compromises made during the development of the **Torn API Faction Tool**.

---

## 📅 Chronological Decisions

### Decision 1: Frontend Stack — Vite with React 18
- **Date**: Initial Setup
- **Status**: **Approved**
- **Rationale**: Vite was chosen over Create React App (CRA) due to its superior bundling speed, instant Hot Module Replacement (HMR), and cleaner configuration profiles. React 18 is utilized for modular functional components and state hook patterns.

---

### Decision 2: Dual-Mode API Key Security Architecture
- **Date**: Initial Setup
- **Status**: **Approved**
- **Rationale**:
  - *Context*: Faction leader API keys carry full access permissions and represent high-value targets. They must never be exposed to clients in production.
  - *Compromise*: A Node.js serverless proxy ([api/torn-proxy.js](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/api/torn-proxy.js)) acts as the guard on Vercel, injecting the hidden environment variable `TORN_FACTION_KEY`.
  - *Development Convenience*: Running Vercel CLI locally requires local environment configurations and slows down UI testing. To bypass this, when the app detects it is on `localhost`, it automatically queries the Torn API directly, attaching the developer's key from `localStorage`.
  - *Safety constraint*: The proxy serverless function explicitly limits outgoing commands to `/faction` or `/torn` endpoints, avoiding any leakage of credentials for arbitrary HTTP calls.

---

### Decision 3: Custom Styling Strategy — Vanilla CSS & HSL Variables
- **Date**: Initial Setup
- **Status**: **Approved**
- **Rationale**:
  - The developer guidelines require a premium, stunning aesthetic (neon glows, animations, responsive tables, custom dark themes).
  - Tailwind CSS was avoided in favor of Vanilla CSS (`Layout.css`, `FactionPage.css`, `index.css`) to allow exact control over custom HSL colors and animation layers without cluttering React syntax with long className lists.
  - Dynamic page styling is handled by shifting CSS variables on `document.documentElement` during a page's mounting cycle, giving each route its own unique glow signature.

---

### Decision 4: Torn V1 vs V2 API Selection Mix
- **Date**: Initial Setup
- **Status**: **Approved**
- **Rationale**:
  - *Context*: While the app targets the newer Torn V2 API, certain selections in the V2 endpoints are incomplete, return inconsistent nested fields, or are deprecated.
  - *Action*: The application implements deliberate fallbacks to V1 endpoints for:
    1. **Armory Inventory**: [fetchFactionArmoryData](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/services/api.js#L89-L93) queries `/faction` directly to pull stable `weapons`, `armor`, `medical`, `drugs`, and `currency` lists.
    2. **Armory Logs**: [fetchFactionArmoryNews](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/services/api.js#L95-L100) calls `/faction` with `armorynews` selections.
    3. **Ranked War Reports**: [fetchRankedWarReport](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/services/api.js#L102-L106) calls `/torn` with `rankedwarreport` selections.
  - *Verification*: The responses are parsed and flattened dynamically to present uniform states to components.

---

### Decision 5: Context-Driven State Management
- **Date**: Initial Setup
- **Status**: **Approved**
- **Rationale**:
  - Lightweight global state context (`DataContext`) is used to propagate user profile names, faction names, and hospital metrics.
  - Redux or Zustand were skipped to keep the bundle footprint small and avoid boilerplate, as the application's global variables are primarily low-frequency vitals updates.
