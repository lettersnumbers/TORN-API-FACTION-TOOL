# Project Roadmap & Future Goals

This document tracks planned features, security upgrades, known limitations, and performance enhancement goals for the **Torn API Faction Tool**.

---

## 🚀 Planned Features & Enhancements

### 1. Armory Valuation & Analytics
- **Goal**: Integrate public Torn item pricing metrics to display the total estimated net worth of the faction's armory cash, points, drugs, medical items, and weapons.
- **UI Element**: Add a financial overview card in the [FactionArmory.jsx](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/pages/FactionArmory.jsx) tab.

### 2. Travel Alert & Landing Dispatcher
- **Goal**: Create automated sound alerts or browser notifications targeting enemy players who are traveling. Since traveling players cannot fight until they land, intercepting them precisely upon arrival is crucial for faction war victories.
- **UI Element**: Enhance the side radar component in [FactionWarRoom.jsx](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/pages/FactionWarRoom.jsx#L264-L294) to track estimated flight arrival countdowns.

### 3. Combat Performance Charts
- **Goal**: Render graphical breakdowns of faction respect gain rates, hit statistics, and chain multipliers over time during active ranked wars.
- **Dependencies**: Integrate lightweight SVG-based graphing utilities or HTML5 Canvas templates to avoid importing large charting packages.

---

## 🔒 Security Enhancements

### 1. Proxy Rate Limiting
- **Goal**: Implement standard API rate-limiting rules directly in the serverless proxy [api/torn-proxy.js](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/api/torn-proxy.js) to prevent user-driven page refreshes from exhausting the Faction Leader's API key quota.

### 2. Access Authorization
- **Goal**: Introduce a basic access-control check or password validation step before the serverless proxy forwards requests, ensuring that only authenticated faction members can invoke the backend proxy.

---

## ⚠️ Known Technical Constraints

### 1. Torn API Rate Limits
- The standard Torn API rate limit is **100 calls per minute** per key. 
- *Risk*: Multiple faction members accessing the dashboard simultaneously in production will share the Faction Leader's key proxy, which can quickly trigger API blocks (`Error 5: Too many requests`).
- *Solution*: Implement server-side caching (e.g., using Vercel KV or simple edge-side headers) to cache faction roster details for 15–30 seconds.

### 2. Serverless Function Timeouts
- Free-tier serverless functions on Vercel are limited to **10 seconds** of execution.
- Any sequential loops (such as the 200ms delay loop in [fetchUserCrimes](file:///c:/Users/sgent/OneDrive/Desktop/TORN%20API%20FACTION%20TOOL/src/services/api.js#L207-L235)) should not be executed inside the proxy. They must be managed client-side to prevent server timeout failures.
