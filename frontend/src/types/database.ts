// Database types generated for Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'Faculty' | 'DeptHead' | 'Admin';

export type RequestStatus = 
  | 'Draft' 
  | 'Pending' 
  | 'Approved' 
  | 'Rejected' 
  | 'Ordered' 
  | 'Received' 
  | 'Completed';

export type ActivityAction = 
  | 'created'
  | 'status_changed'
  | 'delegated'
  | 'comment_added';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          department: string | null;
          approved_budget: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department?: string | null;
          approved_budget?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department?: string | null;
          approved_budget?: number | null;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          category: string | null;
          image_url: string | null;
          status: 'Pending' | 'Qualified' | 'Disqualified';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          updated_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          contact_number: string | null;
          email: string | null;
          address: string | null;
          category: string | null;
          image_url: string | null;
          status: 'Pending' | 'Qualified' | 'Disqualified';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          contact_number?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          image_url?: string | null;
          status?: 'Pending' | 'Qualified' | 'Disqualified';
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          academic_year: string;
          total_amount: number;
          spent_amount: number;
          remaining_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year: string;
          total_amount: number;
          spent_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year?: string;
          total_amount?: number;
          spent_amount?: number;
          updated_at?: string;
        };
      };
      requests: {
        Row: {
          id: string;
          requester_id: string;
          category_id: string | null;
          vendor_id: string | null;
          item_name: string;
          description: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          status: RequestStatus;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          ordered_at: string | null;
          received_at: string | null;
          completed_at: string | null;
          delegated_to: string | null;
          delegated_by: string | null;
          delegated_at: string | null;
          quotation_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          category_id?: string | null;
          vendor_id?: string | null;
          item_name: string;
          description?: string | null;
          quantity?: number;
          unit_price: number;
          status?: RequestStatus;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          completed_at?: string | null;
          delegated_to?: string | null;
          delegated_by?: string | null;
          delegated_at?: string | null;
          quotation_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requester_id?: string;
          category_id?: string | null;
          vendor_id?: string | null;
          item_name?: string;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          status?: RequestStatus;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          ordered_at?: string | null;
          received_at?: string | null;
          completed_at?: string | null;
          delegated_to?: string | null;
          delegated_by?: string | null;
          delegated_at?: string | null;
          quotation_url?: string | null;
          updated_at?: string;
        };
      };
      request_comments: {
        Row: {
          id: string;
          request_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      request_activity: {
        Row: {
          id: string;
          request_id: string;
          actor_id: string | null;
          action: ActivityAction;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          actor_id?: string | null;
          action: ActivityAction;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          details?: Json | null;
        };
      };
      budget_fund_sources: {
        Row: {
          id: string;
          budget_id: string;
          amount: number;
          funds_for: string | null;
          source: string | null;
          date_received: string | null;
          span: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          amount: number;
          funds_for?: string | null;
          source?: string | null;
          date_received?: string | null;
          span?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          budget_id?: string;
          amount?: number;
          funds_for?: string | null;
          source?: string | null;
          date_received?: string | null;
          span?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type Budget = Database['public']['Tables']['budgets']['Row'];
export type Request = Database['public']['Tables']['requests']['Row'];
export type RequestComment = Database['public']['Tables']['request_comments']['Row'];
export type RequestActivity = Database['public']['Tables']['request_activity']['Row'];
export type BudgetFundSource = Database['public']['Tables']['budget_fund_sources']['Row'];

// Extended types with relations
export type RequestWithRelations = Request & {
  requester?: Profile;
  category?: Category;
  vendor?: Vendor;
  delegated_to_profile?: Profile;
};

export type CommentWithAuthor = RequestComment & {
  author?: Profile;
};

export type ActivityWithActor = RequestActivity & {
  actor?: Profile;
};

// Landing page (admin-editable content)
export type LandingBiddingRow = {
  projectTitle: string;
  abc: number;
  referenceNo: string;
  closingDate: string;
};
export type LandingDocumentItem = {
  title: string;
  description: string;
  url: string;
  category: string;
};
export type LandingTransparency = {
  mission: string;
  ctaPrimary: { label: string; url: string; description?: string };
  ctaSecondary: { label: string; url: string; description?: string };
};
export type LandingBidding = { rows: LandingBiddingRow[] };
export type LandingDocuments = { items: LandingDocumentItem[] };
export type LandingPlanning = {
  app: { title: string; description: string; url: string };
  pmr: { title: string; description: string; url: string };
};
export type LandingVendor = {
  accreditationTitle: string;
  accreditationDescription: string;
  accreditationUrl: string;
  loginTitle: string;
  loginDescription: string;
  loginUrl: string;
};
export type LandingBac = {
  secretariatName: string;
  secretariatEmail: string;
  secretariatPhone: string;
  officeAddress: string;
  officeNote: string;
};
export type LandingContent = {
  transparency?: LandingTransparency;
  bidding?: LandingBidding;
  documents?: LandingDocuments;
  planning?: LandingPlanning;
  vendor?: LandingVendor;
  bac?: LandingBac;
};

