# SupplyPulse: Complete Project File Structure

This document provides a highly detailed overview of the SupplyPulse multi-tenant SaaS workspace. It maps out all key operational files across the backend and React Native frontend, explaining their purposes and interactions.

---

## Workspace Directory Tree

```text
supply-pulse-rn/
├── backend/                  # Node.js + Express + Socket.IO server
│   ├── agents/               # Autonomous multi-agent pipeline
│   ├── controllers/          # Business logic & API request handlers
│   ├── data/                 # Static data source seeds (JSON/CSV)
│   ├── middleware/           # Auth guarding & multi-tenant isolation
│   ├── models/               # Mongoose database collections & indexes
│   ├── queue/                # BullMQ background execution queue (Redis)
│   ├── routes/               # API endpoints mounted with guards
│   ├── services/             # Core engines, simulators, & seed utilities
│   ├── server.js             # API entrypoint, socket setup, & bootstrapping
│   └── package.json
│
├── frontend/                 # React Native (Expo) mobile/web application
│   ├── assets/               # Brand logos & static graphic assets
│   ├── src/
│   │   ├── components/       # Premium atom components & SVG icons
│   │   ├── screens/          # Role-based & agentic system screen views
│   │   ├── store/            # Zustand global client-side data store
│   │   ├── utils/            # Platform utilities & server host resolvers
│   │   ├── ThemeContext.js   # Dynamic context provider for custom themes
│   │   └── theme.js          # Tailored style system definitions (HSL tokens)
│   ├── App.js                # React Native entrypoint & socket client
│   └── package.json
│
└── docs/                     # System architecture, logs, & hackathon resources
```

---

## 1. Backend Architecture

The backend operates as an event-driven, tenant-isolated API server coupled with a background simulation engine and an asynchronous multi-agent orchestrator.

### `/backend/agents/`
*   [index.js](file:///d:/supply-pulse-rn/backend/agents/index.js): Monolithic file defining all 11 individual specialized agents (Ingestion, Credibility Scoring, Signal Extraction, Constraint Validator, etc.).
*   [orchestrator.js](file:///d:/supply-pulse-rn/backend/agents/orchestrator.js): Coordinates the agent sequence, manages transactional trace recordings, governs spending bounds, handles emergency PO failovers, and streams telemetry to organization rooms.

### `/backend/controllers/`
*   `authController.js`: Manages organization signup, user creation, user credentials resends, and standard/SSO user login.
*   `crisisController.js`: Manages crisis feeds and logs.
*   `dashboardController.js`: Aggregates director portfolio budgets and regional metrics.
*   `executionController.js`: Provides action plans, execution stages, and post-resolution outcomes.
*   `supplierController.js`: Feeds active SKU supplier maps.

### `/backend/middleware/`
*   `authMiddleware.js`: Validates Bearer JWTs and stamps `req.user`.
*   [tenantMiddleware.js](file:///d:/supply-pulse-rn/backend/middleware/tenantMiddleware.js): Enforces SaaS isolation by mapping tokens to verified organization spaces (`req.orgId`).

### `/backend/models/` (Mongoose Schemas)
*   [Organization.js](file:///d:/supply-pulse-rn/backend/models/Organization.js): Manages individual tenant accounts.
*   [User.js](file:///d:/supply-pulse-rn/backend/models/User.js): Compound index `{ email: 1, organizationId: 1 }` allows same logins across separate organizations.
*   [StockLevel.js](file:///d:/supply-pulse-rn/backend/models/StockLevel.js): SKU-level stock. Scoped by organization.
*   `DataModels.js`: Models for Crisis, Supplier, Contradiction, Outcomes, and Dashboard Metrics.
*   `DataSources.js`: Models for POS registries, email threads, complaints, and scrape articles.

### `/backend/queue/`
*   `redisConnection.js`: Resolves Upstash Redis connection parameters.
*   [agentWorker.js](file:///d:/supply-pulse-rn/backend/queue/agentWorker.js): Listens to the BullMQ queue and processes simulation tasks asynchronously.

### `/backend/services/`
*   [stockSimulator.js](file:///d:/supply-pulse-rn/backend/services/stockSimulator.js): Background simulator modeling live retail sales and auto-generating crisis triggers.
*   [migrateToMultiTenant.js](file:///d:/supply-pulse-rn/backend/services/migrateToMultiTenant.js): Automated database migration service that scopes legacy data and seeds new organizations.
*   `emailService.js`: Delivers automated supplier purchase orders and warnings via Brevo SMTP.
*   `whatsappService.js`: Broadcasts retailer delivery updates.

---

## 2. Frontend (React Native) Architecture

The frontend is a cross-platform React Native app engineered with adaptive layouts (for both desktop browsers and mobile devices), HSL custom color spaces, and dynamic state bindings.

### `/frontend/src/screens/`
*   [RegisterScreen.js](file:///d:/supply-pulse-rn/frontend/src/screens/RegisterScreen.js): Two-step organization and admin deployment form with progress highlights.
*   [LoginScreen.js](file:///d:/supply-pulse-rn/frontend/src/screens/LoginScreen.js): Multi-theme gate with SSO support and organization registration redirection.
*   `FeedScreen.js`: Main crisis feed showing real-time agent mitigations.
*   `StockMonitorScreen.js`: Real-time stock registry displaying active items, safety stock bars, and sales trends.
*   `TraceScreen.js`: Real-time trace logs detailing agent actions.
*   `PlansScreen.js`: Deep dive into active action plans and execution progress.
*   `SettingsScreen.js`: Scoped toggle settings (Auto-Approve, Trigger Mode) and profile metrics.
*   `AdminScreen.js`: Scoped member invite panel for admins.
*   `DirectorScreen.js`: High-level aggregated statistics dashboard.
*   `AnalystScreen.js`: Analytical view of operations.

### `/frontend/src/components/`
*   `Atoms.js`: Core components (Pills, AppBars, Cards, Buttons, and loaders) styled around our theme context.
*   `Icons.js`: Customized SVG icons tailored to look sleek on dark interfaces.

### `/frontend/src/store/`
*   [useAppStore.js](file:///d:/supply-pulse-rn/frontend/src/store/useAppStore.js): Zustand global client state manager housing auth tokens, active stocks, traces, and pending alerts.

---

## 3. Documentation Assets (`/docs/`)

*   `agentic_autonomy.md`: System design detailing closed-loop agent logic and runtime independence for judges.
*   `decision_log.md`: Chronological log of key architectural decisions made during development.
*   `workplan.md`: Full implementation workplan for reference.
