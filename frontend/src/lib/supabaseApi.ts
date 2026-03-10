import { supabase } from './supabaseClient';
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
  LandingContent
} from '../types/database';

// =====================================================
// AUTH API
// =====================================================
export const authAPI = {
  // Sign up with email and password
  signUp: async (email: string, password: string, fullName: string, role: string = 'Faculty') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
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
      .single();

    if (error) throw error;
    return data;
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
    return data || [];
  },

  getById: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
        vendor:vendors(*)
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
        vendor:vendors(*)
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
        vendor:vendors(*)
      `)
      .eq('status', 'Pending')
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
        vendor:vendors(*),
        delegated_to_profile:profiles!delegated_to(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (request: {
    category_id?: string;
    vendor_id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    status?: RequestStatus;
  }): Promise<Request> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
    return requestsAPI.update(id, { 
      status: 'Rejected',
      rejection_reason: reason,
      approved_by: user?.id,
      approved_at: new Date().toISOString()
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
        budget = {
          total: uniBudget.total_amount,
          spent: uniBudget.spent_amount,
          remaining: uniBudget.remaining_amount,
          academicYear: uniBudget.academic_year
        };
      }
    } else {
      // Faculty: use their approved_budget and their own spent (Ordered/Received/Completed requests)
      const approvedTotal = Number(profile?.approved_budget) || 0;
      const { data: spentRequests } = await supabase
        .from('requests')
        .select('total_price')
        .eq('requester_id', user.id)
        .in('status', ['Ordered', 'Received', 'Completed']);
      const spent = spentRequests?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
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
      .select('status');

    if (!isAdminOrDeptHead) {
      requestsQuery = requestsQuery.eq('requester_id', user.id);
    }

    const { data: requestsData } = await requestsQuery;
    
    const requestsByStatus: Record<string, number> = {};
    requestsData?.forEach(r => {
      requestsByStatus[r.status] = (requestsByStatus[r.status] || 0) + 1;
    });

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

    // Get recent requests
    let recentQuery = supabase
      .from('requests')
      .select(`
        *,
        requester:profiles!requester_id(full_name),
        category:categories(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!isAdminOrDeptHead) {
      recentQuery = recentQuery.eq('requester_id', user.id);
    }

    const { data: recentRequests } = await recentQuery;

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
// LANDING PAGE API (public read; admin write)
// =====================================================
export const landingAPI = {
  getAll: async (): Promise<LandingContent> => {
    const { data, error } = await supabase
      .from('landing_page')
      .select('section, data')
      .order('section');
    if (error) throw error;
    const out: LandingContent = {};
    (data || []).forEach((row: { section: string; data: unknown }) => {
      out[row.section as keyof LandingContent] = row.data as never;
    });
    return out;
  },

  updateSection: async (section: string, data: unknown): Promise<void> => {
    const { error } = await supabase
      .from('landing_page')
      .upsert({ section, data, updated_at: new Date().toISOString() }, { onConflict: 'section' });
    if (error) throw error;
  }
};

