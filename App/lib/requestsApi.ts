import { supabase } from './supabase';
import type { RequestWithRelations } from '@/types/requests';

export const requestsAPI = {
  getMyRequests: async (): Promise<RequestWithRelations[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('requests')
      .select(
        `
        *,
        requester:profiles!requester_id(full_name, email),
        category:categories(name),
        vendor:vendors(name)
      `
      )
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as RequestWithRelations[];
  },
};
