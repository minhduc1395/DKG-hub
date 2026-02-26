export interface TimeOffBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const mockBalances: Record<string, TimeOffBalance> = {
  '1': { total: 20, used: 5, remaining: 15 },
  '2': { total: 25, used: 10, remaining: 15 },
};

const mockHistory: TimeOffRequest[] = [
  {
    id: 'req-1',
    userId: '1',
    userName: 'Alex Morgan',
    type: 'Annual Leave',
    startDate: '2023-10-10',
    endDate: '2023-10-12',
    reason: 'Family vacation',
    status: 'approved',
    createdAt: '2023-09-15',
  },
  {
    id: 'req-2',
    userId: '1',
    userName: 'Alex Morgan',
    type: 'Sick Leave',
    startDate: '2023-11-05',
    endDate: '2023-11-05',
    reason: 'Fever',
    status: 'pending',
    createdAt: '2023-11-04',
  },
  {
    id: 'req-3',
    userId: '3',
    userName: 'John Doe',
    type: 'Annual Leave',
    startDate: '2023-12-20',
    endDate: '2023-12-24',
    reason: 'Christmas break',
    status: 'pending',
    createdAt: '2023-11-20',
  }
];

export const timeOffService = {
  async fetchBalance(userId: string): Promise<TimeOffBalance> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockBalances[userId] || { total: 12, used: 0, remaining: 12 };
  },

  async fetchHistory(userId: string): Promise<TimeOffRequest[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockHistory.filter(req => req.userId === userId);
  },

  async fetchPendingApprovals(managerId: string): Promise<TimeOffRequest[]> {
    // Simulate API call - for demo, we return all pending requests
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockHistory.filter(req => req.status === 'pending');
  },

  async fetchApprovalHistory(managerId: string): Promise<TimeOffRequest[]> {
    // Simulate API call - for demo, we return all non-pending requests
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockHistory.filter(req => req.status !== 'pending');
  },

  async submitRequest(data: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>): Promise<TimeOffRequest> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    const newRequest: TimeOffRequest = {
      ...data,
      id: `req-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockHistory.push(newRequest);
    return newRequest;
  },

  async updateRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const req = mockHistory.find(r => r.id === requestId);
    if (req) {
      req.status = status;
    }
  }
};
