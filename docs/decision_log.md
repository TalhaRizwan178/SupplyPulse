# SupplyPulse Decision Log

This log outlines the autonomous decisions made by the agents during the resolution process.

## 1. Contradiction Resolution Decision
- **Trigger**: Disagreement between Warehouse (500 units) and POS (0 units) for Lays Masala 70g.
- **Agent**: Credibility Scoring Agent & Conflict Resolution Agent.
- **Logic**: The agent evaluated the timestamp and nature of the systems. POS systems are real-time point-of-truth for stock leaving the shelf. Warehouse syncs are often batched and subject to manual entry delays.
- **Decision**: Reject the Warehouse data (score 0.4). Trust the POS data (score 0.95). 

## 2. Action Plan Constraint Decision
- **Trigger**: Procurement action required to replenish stock.
- **Agent**: Constraint Validator Agent.
- **Logic**: The proposed primary supplier procurement costs 450,000 PKR. The assigned budget for this SKU category is 500,000 PKR.
- **Decision**: Approve the action as it falls within the required constraints.

## 3. Failure Recovery Decision
- **Trigger**: The Execution Agent simulated a failure when placing a PO to the primary supplier (e.g. unresponsive API / rate limits).
- **Agent**: Recovery Agent.
- **Logic**: A critical stockout cannot wait. The agent checked the secondary supplier database. Secondary supplier has stock but costs 480,000 PKR. This is still within the 500,000 PKR budget constraint.
- **Decision**: Reroute the PO to the secondary supplier. Approve the higher cost to save the 1,000,000 PKR at-risk revenue.
