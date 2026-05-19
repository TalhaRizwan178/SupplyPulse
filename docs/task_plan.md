# SupplyPulse Task Plan

1. **Initialization**: Start Express server and connect to MongoDB.
2. **Data Ingestion**: Load mock data for 5 sources (Warehouse, POS, Email, Complaints, News).
3. **Signal Extraction**: Process data to identify anomalies (e.g., POS > Warehouse stock).
4. **Contradiction Detection**: Explicitly flag the contradiction between Warehouse (says 500) and POS (says 0).
5. **Credibility Scoring**: Score sources based on predefined metrics (POS > Warehouse for real-time accuracy).
6. **Resolution**: Determine true state (Stock is empty).
7. **Insight Generation**: Produce summary insight for operations manager.
8. **Action Planning**: Generate steps: Validate -> Procure -> Notify -> Monitor.
9. **Constraint Check**: Ensure procurement fits within 500k PKR budget.
10. **Execution - Step 1**: Validate inventory (Success).
11. **Execution - Step 2**: Attempt procurement from primary supplier (Simulated Failure).
12. **Recovery**: Detect failure, re-route to secondary supplier (Success).
13. **Execution - Step 3**: Notify retailers (Success).
14. **Execution - Step 4**: Setup monitoring (Success).
15. **Outcome Calculation**: Generate before/after metrics for the dashboard.
