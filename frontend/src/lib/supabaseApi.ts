import { supabase } from './supabaseClient';
import { normalizeUserRole } from './roles';
import type { 
  Profile, 
  Category, 
  Vendor, 
  Budget, 
  BudgetFundSource,
  Request, 
  RequestWithRelations,
  RequestStatus,
  CommentWithAuthor,
  ActivityWithActor,
  LandingContent,
  TransparencySealEntry,
  TransparencySealEntryRow,
  TransparencyFeaturedItem,
  BidBulletin,
  BidBulletinRow,
  BidBulletinAttachment
} from '../types/database';

function withNormalizedRole(p: Profile | null): Profile | null {
  if (!p) return null;
  return { ...p, role: normalizeUserRole(p.role) };
}

// =====================================================
// AUTH API
// =====================================================
export const authAPI = {
  // Sign up with email and password
  signUp: async (email: string, password: string, fullName: string, role: string = 'Faculty', department?: string | null) => {
    const canonicalRole = normalizeUserRole(role);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: canonicalRole,
          ...(department != null && department !== '' ? { department } : {})
        }
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Reset password (sends password reset email)
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Get current user's profile
  getProfile: async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return withNormalizedRole(data);
  }
};

// =====================================================
// PROFILES API
// =====================================================
export const profilesAPI = {
  getAll: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, role: normalizeUserRole(row.role) }));
  },

  getById: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return withNormalizedRole(data);
  },

  update: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
    const payload = { ...updates };
    if (payload.role !== undefined && payload.role !== null) {
      payload.role = normalizeUserRole(payload.role);
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return withNormalizedRole(data);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// CATEGORIES API
// =====================================================
export const categoriesAPI = {
  getAll: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Category | null> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (category: { name: string; description?: string }): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Category>): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// VENDORS API (keeping for backward compatibility)
// =====================================================
export const vendorsAPI = {
  getAll: async (): Promise<Vendor[]> => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Vendor | null> => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> => {
    const { data, error } = await supabase
      .from('vendors')
      .insert(vendor)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Vendor>): Promise<Vendor> => {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// SUPPLIERS API (for supplier registration)
// =====================================================
import type { Supplier } from '../types/database';

export const suppliersAPI = {
  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Supplier | null> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// BUDGETS API
// =====================================================
export const budgetsAPI = {
  getAll: async (): Promise<Budget[]> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getCurrent: async (): Promise<Budget | null> => {
    const rows = await budgetsAPI.getCurrentYearBudgets();
    if (!rows || rows.length === 0) return null;
    const aggregated = rows.reduce(
      (acc, b) => ({
        ...acc,
        total_amount: acc.total_amount + b.total_amount,
        spent_amount: acc.spent_amount + b.spent_amount,
        remaining_amount: acc.remaining_amount + b.remaining_amount
      }),
      {
        ...rows[0],
        total_amount: 0,
        spent_amount: 0,
        remaining_amount: 0
      }
    );
    return aggregated;
  },

  /** Current budget with "used" = sum of Approved + Ordered + Received + Completed (so remaining reflects committed budget) */
  getCurrentWithCommitted: async (): Promise<Budget | null> => {
    const current = await budgetsAPI.getCurrent();
    if (!current) return null;
    const { data: rows } = await supabase
      .from('requests')
      .select('total_price')
      .in('status', ['Approved', 'Ordered', 'Received', 'Completed']);
    const used = rows?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
    return {
      ...current,
      spent_amount: used,
      remaining_amount: Math.max(0, current.total_amount - used)
    };
  },

  getCurrentYearBudgets: async (): Promise<Budget[]> => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startYear = currentMonth < 7 ? currentYear - 1 : currentYear;
    const academicYear = `${startYear}-${startYear + 1}`;
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('academic_year', academicYear)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<Budget | null> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  getByYear: async (year: string): Promise<Budget | null> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('academic_year', year)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  create: async (budget: { academic_year: string; total_amount: number }): Promise<Budget> => {
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, spent_amount: 0 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Budget>): Promise<Budget> => {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  upsert: async (budget: { academic_year: string; total_amount: number }): Promise<Budget> => {
    const { data, error } = await supabase
      .from('budgets')
      .upsert({ ...budget, spent_amount: 0 }, { onConflict: 'academic_year' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// =====================================================
// BUDGET FUND SOURCES API (breakdown of where budget came from)
// =====================================================
export const budgetFundSourcesAPI = {
  getByBudgetId: async (budgetId: string): Promise<BudgetFundSource[]> => {
    const { data, error } = await supabase
      .from('budget_fund_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .order('date_received', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  create: async (source: {
    budget_id: string;
    amount: number;
    funds_for?: string | null;
    source?: string | null;
    date_received?: string | null;
    span?: string | null;
  }): Promise<BudgetFundSource> => {
    const { data, error } = await supabase
      .from('budget_fund_sources')
      .insert(source)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Omit<BudgetFundSource, 'id' | 'budget_id' | 'created_at'>>): Promise<BudgetFundSource> => {
    const { data, error } = await supabase
      .from('budget_fund_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('budget_fund_sources').delete().eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// REQUESTS API
// =====================================================
export const requestsAPI = {
  getAll: async (filters?: { status?: RequestStatus }): Promise<RequestWithRelations[]> => {
    let query = supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        supplier:suppliers!supplier_id(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  getMyRequests: async (): Promise<RequestWithRelations[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        supplier:suppliers!supplier_id(*)
      `)
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getPending: async (): Promise<RequestWithRelations[]> => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        supplier:suppliers!supplier_id(*)
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /** Requests that need admin action: Pending, Approved, Gathering supplies (Ordered), Delivering (Received). Keeps approved requests on the page with progress buttons. */
  getApprovalsQueue: async (): Promise<RequestWithRelations[]> => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        supplier:suppliers!supplier_id(*)
      `)
      .in('status', ['Pending', 'Approved', 'Ordered', 'Received'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<RequestWithRelations | null> => {
    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(*),
        category:categories(*),
        supplier:suppliers!supplier_id(*),
        delegated_to_profile:profiles!delegated_to(*),
        bid_winner_supplier:suppliers!bid_winner_supplier_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (request: {
    category_id?: string;
    supplier_id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    status?: RequestStatus;
  }): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // total_price is computed by the database (trigger or generated column), do not send it on insert
    const { data, error } = await supabase
      .from('requests')
      .insert({
        ...request,
        requester_id: user.id,
        status: request.status || 'Draft'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Request>): Promise<Request> => {
    const { data, error } = await supabase
      .from('requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Workflow actions
  submit: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { status: 'Pending' });
  },

  approve: async (id: string): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    return requestsAPI.update(id, { 
      status: 'Approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
  },

  reject: async (id: string, reason: string): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates: Partial<Request> = {
      status: 'Rejected',
      rejection_reason: reason || null,
      approved_at: new Date().toISOString()
    };
    if (user?.id) updates.approved_by = user.id;
    return requestsAPI.update(id, updates);
  },

  setNegotiating: async (id: string, notes?: string): Promise<Request> => {
    return requestsAPI.update(id, {
      status: 'Negotiating',
      negotiating_notes: notes || null
    });
  },

  agreeToProceed: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, {
      status: 'Pending',
      negotiating_notes: null
    });
  },

  markOrdered: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Ordered',
      ordered_at: new Date().toISOString()
    });
  },

  markReceived: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Received',
      received_at: new Date().toISOString()
    });
  },

  markDelivering: async (id: string, payload: { bid_winner_supplier_id?: string | null; delivery_notes?: string | null; delivery_attachment_url?: string | null }): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Received',
      received_at: new Date().toISOString(),
      bid_winner_supplier_id: payload.bid_winner_supplier_id ?? null,
      delivery_notes: payload.delivery_notes ?? null,
      delivery_attachment_url: payload.delivery_attachment_url ?? null
    });
  },

  /** Upload optional attachment when marking as Delivering. Uses bucket procurement-documents path delivery-attachments/{requestId}/... */
  uploadDeliveryAttachment: async (requestId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `delivery-attachments/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('procurement-documents').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('procurement-documents').getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  markCompleted: async (id: string): Promise<Request> => {
    return requestsAPI.update(id, { 
      status: 'Completed',
      completed_at: new Date().toISOString()
    });
  },

  // Delegation
  delegate: async (id: string, delegateToId: string): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    return requestsAPI.update(id, { 
      delegated_to: delegateToId,
      delegated_by: user?.id,
      delegated_at: new Date().toISOString()
    });
  }
};

// =====================================================
// COMMENTS API
// =====================================================
export const commentsAPI = {
  getByRequestId: async (requestId: string): Promise<CommentWithAuthor[]> => {
    const { data, error } = await supabase
      .from('request_comments')
      .select(`
        *,
        author:profiles!author_id(*)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  create: async (requestId: string, content: string): Promise<CommentWithAuthor> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('request_comments')
      .insert({
        request_id: requestId,
        author_id: user.id,
        content
      })
      .select(`
        *,
        author:profiles!author_id(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }
};

// =====================================================
// ACTIVITY API (Audit Trail)
// =====================================================
export const activityAPI = {
  getByRequestId: async (requestId: string): Promise<ActivityWithActor[]> => {
    const { data, error } = await supabase
      .from('request_activity')
      .select(`
        *,
        actor:profiles!actor_id(*)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** All recent request activity (admin audit log). */
  getAllRecent: async (limit = 150): Promise<ActivityWithActor[]> => {
    const { data, error } = await supabase
      .from('request_activity')
      .select(`
        *,
        actor:profiles!actor_id(*),
        request:requests!request_id(id, item_name, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};

// =====================================================
// DASHBOARD API
// =====================================================
export const dashboardAPI = {
  getStats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get profile to check role
    const profile = await authAPI.getProfile();
    const isAdminOrDeptHead = profile?.role === 'Admin' || profile?.role === 'DeptHead';

    // Budget: for Faculty show their approved budget; for Admin/DeptHead show university budget
    let budget: { total: number; spent: number; remaining: number; academicYear: string } | null = null;
    if (isAdminOrDeptHead) {
      const uniBudget = await budgetsAPI.getCurrent();
      if (uniBudget) {
        const { data: committedRequests } = await supabase
          .from('requests')
          .select('total_price')
          .in('status', ['Approved', 'Ordered', 'Received', 'Completed']);
        const used = committedRequests?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
        budget = {
          total: uniBudget.total_amount,
          spent: used,
          remaining: Math.max(0, uniBudget.total_amount - used),
          academicYear: uniBudget.academic_year
        };
      }
    } else {
      // Faculty: use their approved_budget and their own used (Approved + Ordered/Received/Completed)
      const approvedTotal = Number(profile?.approved_budget) || 0;
      const { data: usedRequests } = await supabase
        .from('requests')
        .select('total_price')
        .eq('requester_id', user.id)
        .in('status', ['Approved', 'Ordered', 'Received', 'Completed']);
      const spent = usedRequests?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
      budget = {
        total: approvedTotal,
        spent,
        remaining: Math.max(0, approvedTotal - spent),
        academicYear: 'Your allocation'
      };
    }

    // Get pending approvals count
    const { count: pendingApprovals } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    // Get request counts by status
    let requestsQuery = supabase
      .from('requests')
      .select('status, created_at');

    if (!isAdminOrDeptHead) {
      requestsQuery = requestsQuery.eq('requester_id', user.id);
    }

    const { data: requestsData } = await requestsQuery;

    const requestsByStatus: Record<string, number> = {};
    if (isAdminOrDeptHead) {
      requestsData?.forEach(r => {
        const status = r.status;
        const key = status ? status.charAt(0).toUpperCase() + (status.slice(1) || '').toLowerCase() : status;
        requestsByStatus[key] = (requestsByStatus[key] || 0) + 1;
      });
    } else {
      // Faculty: only one request at a time in progress; pipeline shows only that current request
      const inProgressStatuses = ['Draft', 'Pending', 'Negotiating'];
      const sorted = (requestsData || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const currentRequest = sorted.find(r =>
        inProgressStatuses.includes(r.status)
      ) ?? sorted[0];
      if (currentRequest?.status) {
        const key = currentRequest.status.charAt(0).toUpperCase() + (currentRequest.status.slice(1) || '').toLowerCase();
        requestsByStatus[key] = 1;
      }
    }

    // Get monthly spending
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let monthlyQuery = supabase
      .from('requests')
      .select('total_price')
      .in('status', ['Ordered', 'Received', 'Completed'])
      .gte('ordered_at', startOfMonth.toISOString());
    if (!isAdminOrDeptHead) {
      monthlyQuery = monthlyQuery.eq('requester_id', user.id);
    }
    const { data: monthlyData } = await monthlyQuery;
    const monthlySpending = monthlyData?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

    // Get recent requests (for faculty: only the single current request)
    let recentRequests: any[] = [];
    if (isAdminOrDeptHead) {
      const { data } = await supabase
        .from('requests')
        .select(`
          *,
          requester:profiles!requester_id(full_name),
          category:categories(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      recentRequests = data || [];
    } else {
      const { data: myRequests } = await supabase
        .from('requests')
        .select(`
          *,
          requester:profiles!requester_id(full_name),
          category:categories(name)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });
      const inProgressStatuses = ['Draft', 'Pending', 'Negotiating'];
      const current = (myRequests || []).find(r => inProgressStatuses.includes(r.status))
        ?? (myRequests || [])[0];
      recentRequests = current ? [current] : [];
    }

    // Get total requests count
    let totalQuery = supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });

    if (!isAdminOrDeptHead) {
      totalQuery = totalQuery.eq('requester_id', user.id);
    }

    const { count: totalRequests } = await totalQuery;

    return {
      budget,
      pendingApprovals: pendingApprovals || 0,
      totalRequests: totalRequests || 0,
      monthlySpending,
      requestsByStatus,
      recentRequests: recentRequests || []
    };
  }
};

// =====================================================
// TRANSPARENCY SEAL ENTRIES (new table)
// =====================================================
function rowToEntry(r: TransparencySealEntryRow): TransparencySealEntry {
  return {
    mission: r.mission ?? undefined,
    featuredItem: {
      projectTitle: r.project_title,
      referenceNo: r.reference_no,
      abc: r.abc,
      closingDate: r.closing_date ?? '',
      openingDate: r.opening_date ?? undefined,
      location: r.location ?? undefined,
      description: r.description ?? undefined,
      requirements: r.requirements ?? [],
      contactPerson: r.contact_person ?? undefined,
      contactEmail: r.contact_email ?? undefined,
      contactPhone: r.contact_phone ?? undefined,
      status: r.status
    }
  };
}

function entryToRow(entry: TransparencySealEntry, displayOrder = 0): Omit<TransparencySealEntryRow, 'id' | 'created_at'> {
  const f = entry.featuredItem ?? {};
  return {
    mission: entry.mission ?? null,
    project_title: f.projectTitle ?? '',
    reference_no: f.referenceNo ?? '',
    abc: typeof f.abc === 'number' && !Number.isNaN(f.abc) ? f.abc : Math.floor(Number(f.abc)) || 0,
    closing_date: f.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(String(f.closingDate)) ? String(f.closingDate) : null,
    opening_date: f.openingDate && /^\d{4}-\d{2}-\d{2}$/.test(String(f.openingDate)) ? String(f.openingDate) : null,
    location: f.location ?? null,
    description: f.description ?? null,
    requirements: Array.isArray(f.requirements) ? f.requirements : [],
    contact_person: f.contactPerson ?? null,
    contact_email: f.contactEmail ?? null,
    contact_phone: f.contactPhone ?? null,
    status: f.status ?? 'Active',
    display_order: displayOrder
  };
}

export const transparencySealAPI = {
  getAll: async (): Promise<TransparencySealEntry[]> => {
    const { data, error } = await supabase
      .from('transparency_seal_entries')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => rowToEntry(r as TransparencySealEntryRow));
  },

  getAllRows: async (): Promise<(TransparencySealEntryRow & { _entry?: TransparencySealEntry })[]> => {
    const { data, error } = await supabase
      .from('transparency_seal_entries')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => {
      const row = r as TransparencySealEntryRow;
      return { ...row, _entry: rowToEntry(row) };
    });
  },

  create: async (entry: TransparencySealEntry): Promise<TransparencySealEntry> => {
    const rows = await supabase.from('transparency_seal_entries').select('display_order').order('display_order', { ascending: false }).limit(1);
    const nextOrder = (rows.data?.[0] as { display_order?: number } | undefined)?.display_order ?? 0;
    const payload = entryToRow(entry, nextOrder + 1);
    const { data, error } = await supabase.from('transparency_seal_entries').insert(payload).select().single();
    if (error) throw error;
    return rowToEntry(data as TransparencySealEntryRow);
  },

  update: async (id: string, entry: TransparencySealEntry): Promise<void> => {
    const payload = entryToRow(entry, 0);
    const { display_order: _, ...updatePayload } = payload;
    const { error } = await supabase.from('transparency_seal_entries').update(updatePayload).eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('transparency_seal_entries').delete().eq('id', id);
    if (error) throw error;
  }
};

// =====================================================
// BID BULLETINS API
// =====================================================
const BID_BULLETIN_BUCKET = 'bid-bulletin-attachments';

function rowToBidBulletin(r: BidBulletinRow): BidBulletin & { id: string } {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    title: r.title,
    referenceNo: r.reference_no,
    date: r.date ?? '',
    relatedTo: r.related_to ?? undefined,
    description: r.description ?? undefined,
    changes: r.changes ?? [],
    attachments: Array.isArray(r.attachments) ? r.attachments : []
  };
}

export const bidBulletinsAPI = {
  getAll: async (): Promise<(BidBulletin & { id: string })[]> => {
    const { data, error } = await supabase
      .from('bid_bulletins')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => rowToBidBulletin(r as BidBulletinRow));
  },

  create: async (bulletin: BidBulletin): Promise<BidBulletin & { id: string }> => {
    const { data: maxOrder } = await supabase
      .from('bid_bulletins')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    const order = (maxOrder as { display_order?: number } | null)?.display_order ?? 0;
    const payload = {
      type: bulletin.type,
      status: bulletin.status,
      title: bulletin.title,
      reference_no: bulletin.referenceNo,
      date: bulletin.date || null,
      related_to: bulletin.relatedTo || null,
      description: bulletin.description || null,
      changes: bulletin.changes ?? [],
      attachments: bulletin.attachments ?? [],
      display_order: order + 1
    };
    const { data, error } = await supabase.from('bid_bulletins').insert(payload).select().single();
    if (error) throw error;
    return rowToBidBulletin(data as BidBulletinRow);
  },

  update: async (id: string, bulletin: BidBulletin): Promise<void> => {
    const { error } = await supabase
      .from('bid_bulletins')
      .update({
        type: bulletin.type,
        status: bulletin.status,
        title: bulletin.title,
        reference_no: bulletin.referenceNo,
        date: bulletin.date || null,
        related_to: bulletin.relatedTo || null,
        description: bulletin.description || null,
        changes: bulletin.changes ?? [],
        attachments: bulletin.attachments ?? []
      })
      .eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('bid_bulletins').delete().eq('id', id);
    if (error) throw error;
  },

  uploadAttachment: async (bulletinId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${bulletinId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from(BID_BULLETIN_BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BID_BULLETIN_BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  }
};

// =====================================================
// LANDING PAGE API (public read; admin write)
// =====================================================
export const landingAPI = {
  getAll: async (): Promise<LandingContent> => {
    const [pageRes, entriesRes] = await Promise.all([
      supabase.from('landing_page').select('section, data').order('section'),
      supabase.from('transparency_seal_entries').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true })
    ]);
    if (pageRes.error) throw pageRes.error;
    const out: LandingContent = {};
    (pageRes.data || []).forEach((row: { section: string; data: unknown }) => {
      out[row.section as keyof LandingContent] = row.data as never;
    });
    if (entriesRes.data && entriesRes.data.length > 0) {
      const items = (entriesRes.data as TransparencySealEntryRow[]).map((row) => ({ ...rowToEntry(row), id: row.id }));
      const last = items[items.length - 1];
      out.transparency = {
        ...(out.transparency as object),
        items,
        mission: items[0]?.mission ?? (out.transparency as { mission?: string })?.mission,
        featuredItem: last?.featuredItem ?? (out.transparency as { featuredItem?: TransparencyFeaturedItem })?.featuredItem
      } as never;
    }
    return out;
  },

  updateSection: async (section: string, data: unknown): Promise<void> => {
    const { error } = await supabase
      .from('landing_page')
      .upsert({ section, data, updated_at: new Date().toISOString() }, { onConflict: 'section' });
    if (error) throw error;
  }
};

