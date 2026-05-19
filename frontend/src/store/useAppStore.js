import { create } from 'zustand';

const useAppStore = create((set) => ({
  socketConnected: false,
  setSocketConnected: (status) => set({ socketConnected: status }),

  agentTraces: [],
  addAgentTrace: (trace) => set((state) => ({ agentTraces: [...state.agentTraces, trace] })),
  clearTraces: () => set({ agentTraces: [] }),

  currentScenario: null,
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),

  agentStatus: 'idle', // idle, running, completed, failed
  setAgentStatus: (status) => set({ agentStatus: status }),

  outcomes: null,
  setOutcomes: (outcomes) => set({ outcomes }),

  authToken: null,
  setAuthToken: (token) => set({ authToken: token }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  autoTriggerEvents: [],
  addAutoTriggerEvent: (event) => set((state) => ({
    autoTriggerEvents: [event, ...state.autoTriggerEvents].slice(0, 20),
  })),

  // Live stock data (updated via socket), enriched with trend direction
  stockData: [],
  setStockData: (newData) => set((state) => {
    // Attach trend: 'up' | 'down' | 'same' by comparing with previous values
    const prevMap = {};
    state.stockData.forEach(s => { prevMap[s.sku] = s.current_stock; });
    const enriched = newData.map(s => ({
      ...s,
      trend: prevMap[s.sku] === undefined ? 'same'
        : s.current_stock > prevMap[s.sku] ? 'up'
        : s.current_stock < prevMap[s.sku] ? 'down'
        : 'same',
    }));
    return { stockData: enriched };
  }),

  // Pending triggers waiting for user approval
  pendingTriggers: [],
  addPendingTrigger: (trigger) => set((state) => ({
    pendingTriggers: [trigger, ...state.pendingTriggers],
  })),
  removePendingTrigger: (id) => set((state) => ({
    pendingTriggers: state.pendingTriggers.filter(t => String(t._id) !== String(id)),
  })),
  setPendingTriggers: (triggers) => set({ pendingTriggers: triggers }),

  // IDs of pending triggers currently animating out
  dismissingIds: [],
  markDismissing: (id) => set((state) => ({
    dismissingIds: [...state.dismissingIds, String(id)],
  })),
  unmarkDismissing: (id) => set((state) => ({
    dismissingIds: state.dismissingIds.filter(d => d !== String(id)),
  })),

  // Auto-trigger setting (synced with backend)
  autoTriggerEnabled: false,
  setAutoTriggerEnabled: (val) => set({ autoTriggerEnabled: val }),

  // Other agent settings (synced with backend)
  autoApproveEnabled: true,
  setAutoApproveEnabled: (val) => set({ autoApproveEnabled: val }),
  pauseOnFailure: false,
  setPauseOnFailure: (val) => set({ pauseOnFailure: val }),
}));

export default useAppStore;
