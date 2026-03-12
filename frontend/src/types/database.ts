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
  | 'Negotiating'
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
          contact_first_name?: string | null;
          contact_middle_name?: string | null;
          contact_last_name?: string | null;
          tin_number?: string | null;
          business_registration_no?: string | null;
          business_type?: string | null;
          portfolio_url?: string | null;
          project_attending?: string | null;
          portfolio_urls?: string[] | null;
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
          contact_first_name?: string | null;
          contact_middle_name?: string | null;
          contact_last_name?: string | null;
          tin_number?: string | null;
          business_registration_no?: string | null;
          business_type?: string | null;
          portfolio_url?: string | null;
          project_attending?: string | null;
          portfolio_urls?: string[] | null;
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
          contact_first_name?: string | null;
          contact_middle_name?: string | null;
          contact_last_name?: string | null;
          tin_number?: string | null;
          business_registration_no?: string | null;
          business_type?: string | null;
          portfolio_url?: string | null;
          project_attending?: string | null;
          portfolio_urls?: string[] | null;
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
          supplier_id: string | null;
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
          bid_winner_supplier_id: string | null;
          delivery_notes: string | null;
          delivery_attachment_url: string | null;
          negotiating_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          category_id?: string | null;
          supplier_id?: string | null;
          item_name: string;
          description?: string | null;
          quantity?: number;
          unit_price: number;
          total_price?: number;
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
          bid_winner_supplier_id?: string | null;
          delivery_notes?: string | null;
          delivery_attachment_url?: string | null;
          negotiating_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requester_id?: string;
          category_id?: string | null;
          supplier_id?: string | null;
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
          bid_winner_supplier_id?: string | null;
          delivery_notes?: string | null;
          delivery_attachment_url?: string | null;
          negotiating_notes?: string | null;
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
      bid_winners: {
        Row: {
          id: string;
          request_id: string | null;
          project_title: string;
          reference_no: string | null;
          winner_supplier_id: string | null;
          winner_name: string | null;
          contract_amount: number;
          date_awarded: string | null;
          notes: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          project_title: string;
          reference_no?: string | null;
          winner_supplier_id?: string | null;
          winner_name?: string | null;
          contract_amount?: number;
          date_awarded?: string | null;
          notes?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          request_id?: string | null;
          project_title?: string;
          reference_no?: string | null;
          winner_supplier_id?: string | null;
          winner_name?: string | null;
          contract_amount?: number;
          date_awarded?: string | null;
          notes?: string | null;
          display_order?: number;
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
export type BidWinner = Database['public']['Tables']['bid_winners']['Row'];

// Extended types with relations
export type BidWinnerWithSupplier = BidWinner & {
  winner_supplier?: Supplier | null;
};

export type RequestWithRelations = Request & {
  requester?: Profile;
  category?: Category;
  supplier?: Supplier;
  delegated_to_profile?: Profile;
  bid_winner_supplier?: Supplier;
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
/** Single featured procurement item (matches mock data structure) for Transparency Seal */
export type TransparencyFeaturedItem = {
  projectTitle: string;
  referenceNo: string;
  abc: number;
  closingDate: string;
  openingDate?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
};

/** Single saved transparency seal entry (mission + featured item); id set when loaded from DB */
export type TransparencySealEntry = {
  id?: string;
  mission?: string;
  featuredItem?: TransparencyFeaturedItem;
};

/** Row from transparency_seal_entries table (snake_case) */
export type TransparencySealEntryRow = {
  id: string;
  created_at: string;
  mission: string | null;
  project_title: string;
  reference_no: string;
  abc: number;
  closing_date: string | null;
  opening_date: string | null;
  location: string | null;
  description: string | null;
  requirements: string[];
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  display_order: number;
};

export type LandingTransparency = {
  mission?: string;
  featuredItem?: TransparencyFeaturedItem;
  /** List of saved entries; newest appended when user clicks "Add transparency seal" */
  items?: TransparencySealEntry[];
};
export type LandingBidding = { rows: LandingBiddingRow[] };
export type LandingDocuments = { items: LandingDocumentItem[] };

/** Single APP planned item (admin adds these; shown on annual-procurement-plan by month) */
export type AppPlannedItem = {
  projectTitle: string;
  description: string;
  budget: number;
  month: number; // 0 = January, 11 = December
};

export type LandingPlanning = {
  appItems?: AppPlannedItem[];
  pmr?: { title?: string; description?: string; url?: string };
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

/** Single bid bulletin attachment (name + url) */
export type BidBulletinAttachment = { name: string; url: string };

/** Bid bulletin for Supplemental / Bid Bulletins (admin form + public list) */
export type BidBulletin = {
  id?: string;
  type: string;
  status: string;
  title: string;
  referenceNo: string;
  date: string;
  relatedTo?: string;
  description?: string;
  changes: string[];
  attachments: BidBulletinAttachment[];
};

/** Row from bid_bulletins table */
export type BidBulletinRow = {
  id: string;
  created_at: string;
  type: string;
  status: string;
  title: string;
  reference_no: string;
  date: string | null;
  related_to: string | null;
  description: string | null;
  changes: string[];
  attachments: BidBulletinAttachment[];
  display_order: number;
};

