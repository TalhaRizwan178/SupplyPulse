# SupplyPulse Agent Trace

**Scenario**: Lays Masala 70g stockout in Karachi.
**Run ID**: SCENARIO-12345

### [00:00.0] Orchestrator Agent
- **Action**: Triggered
- **State**: Starting multi-agent pipeline.

### [00:01.2] Ingestion Agent
- **Action**: Data Normalized
- **Output**: 
  - Source 1 (Warehouse): 500 units at 10:00 AM
  - Source 2 (POS): 0 units at 10:05 AM
  - Source 3 (Supplier Email): 2-day delay on incoming shipment.

### [00:02.5] Signal Extraction Agent
- **Action**: Signals Extracted
- **Output**: Risk Signal: "Stock mismatch detected between WH and POS for Lays Masala 70g."

### [00:03.8] Contradiction Detection Agent
- **Action**: Conflicts Detected
- **Output**: Conflict on `stock_count` between WH (500) and POS (0).

### [00:05.1] Credibility Scoring Agent
- **Action**: Sources Scored
- **Output**: WH Score: 0.4 (Batch sync, often stale). POS Score: 0.95 (Real-time).

### [00:06.4] Conflict Resolution Agent
- **Action**: Conflict Resolved
- **Output**: Trusted source is POS. Actual stock is 0. WH data flagged as stale.

### [00:07.7] Insight Synthesis Agent
- **Action**: Insight Generated
- **Output**: "Critical stockout of Lays Masala 70g confirmed at POS. Warehouse data is stale."

### [00:09.0] Action Planning Agent
- **Action**: Plan Drafted
- **Output**: 1. Validate inventory -> 2. Procure from primary -> 3. Notify retailers.

### [00:10.5] Constraint Validator Agent
- **Action**: Plan Validated
- **Output**: Step 2 cost is 450k PKR. Budget is 500k PKR. Plan approved.

### [00:12.0] Execution Agent
- **Action**: Execution Attempted
- **Output**: Step 1 (Validate): Success. Step 2 (Procure): FAILED. Reason: "Supplier rate limit exceeded / unresponsive."

### [00:14.2] Recovery Agent
- **Action**: Alternative Action Executed
- **Output**: Replaced Step 2 with "Procure from secondary supplier". Cost: 480k PKR. Status: Success.

### [00:15.5] Outcome Agent
- **Action**: Outcomes Computed
- **Output**: Saved 1M PKR in at-risk revenue by spending 480k PKR. Stock updated to 1000 units arriving EOD.
