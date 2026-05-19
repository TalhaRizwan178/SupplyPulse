# SupplyPulse Workplan

## Overview
SupplyPulse is an Autonomous Supply Chain Crisis Commander. It operates using a multi-agent architecture composed of 12 specific AI agents that collaborate to resolve supply chain contradictions.

## Agent Architecture
1. **Orchestrator Agent**: Coordinates the flow of data between the sub-agents and manages the state of the crisis resolution scenario.
2. **Ingestion Agent**: Pulls mock data sources (warehouse CSV, POS JSON, supplier emails, customer complaints, news).
3. **Signal Extraction Agent**: Analyzes data to extract early indicators of supply/demand risks.
4. **Contradiction Detection Agent**: Identifies misaligned data (e.g. warehouse says 500 units, POS says 0 units).
5. **Credibility Scoring Agent**: Scores conflicting sources based on recency and historical reliability.
6. **Conflict Resolution Agent**: Resolves the contradiction, selecting the most reliable ground truth.
7. **Insight Synthesis Agent**: Generates a human-readable summary of the crisis and the determined facts.
8. **Action Planning Agent**: Formulates a 3-5 step action chain to resolve the crisis.
9. **Constraint Validator Agent**: Validates actions against budget, time, and rate limits.
10. **Execution Agent**: Simulates the execution of the validated actions via mock tools.
11. **Recovery Agent**: Steps in if an execution step fails, proposing alternative paths.
12. **Outcome Agent**: Calculates the simulated impact of the executed actions (before/after metrics).

## Workflow Execution
- **Trigger**: The mobile app triggers a scenario (e.g., Lays Masala stockout in Karachi).
- **Processing**: The Orchestrator calls Agents 2 through 9 to analyze and plan.
- **Execution & Tracing**: The Orchestrator calls the Execution Agent. Real-time events are streamed to the React Native app via Socket.IO.
- **Failure Handling**: During execution, a simulated failure occurs (e.g., supplier doesn't pick up). The Recovery Agent is invoked to use an alternate supplier.
- **Completion**: Outcomes are calculated and presented in the mobile app dashboard.
