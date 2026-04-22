import { supabase } from './supabase';
import type { RequestWithRelations } from '@/types/requests';

/** Attach `requester` profile fields when list queries omit the embed (e.g. RPC-only rows). */
export async function enrichRowsWithRequesters(rows: RequestWithRelations[]): Promise<RequestWithRelations[]> {
  const ids = [...new Set(rows.map((r) => r.requester_id).filter(Boolean))];
  if (ids.length === 0) return rows;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, department, faculty_department')
    .in('id', ids);
  if (error || !data?.length) return rows;
  const map = new Map(
    data.map((p) => [
      String(p.id),
      {
        full_name: p.full_name ?? undefined,
        email: p.email ?? undefined,
        department: p.department ?? undefined,
        faculty_department: p.faculty_department ?? undefined,
      },
    ])
  );
  return rows.map((r) => ({
    ...r,
    requester: map.get(String(r.requester_id)) ?? r.requester,
  }));
}
