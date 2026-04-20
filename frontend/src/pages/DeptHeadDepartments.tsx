import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collegesAPI, profilesQueryAPI } from '../lib/supabaseApi';
import type { College, Profile } from '../types/database';
import { Building2, Loader2 } from 'lucide-react';

type DepartmentRow = {
  department: string;
  fullName: string;
  email: string;
};

export default function DeptHeadDepartments() {
  const { profile } = useAuth();
  const [college, setCollege] = useState<College | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!profile?.id) return;
      setLoading(true);
      setError('');
      try {
        const allColleges = await collegesAPI.getAll();
        const handled = allColleges.find((c) => c.handler_id === profile.id) ?? null;
        if (!mounted) return;
        setCollege(handled);
        if (!handled?.name) {
          setProfiles([]);
          return;
        }
        const rows = await profilesQueryAPI.getByDepartment(handled.name);
        if (!mounted) return;
        setProfiles(rows);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load departments.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const departments = useMemo<DepartmentRow[]>(() => {
    return profiles
      .map((p) => ({
        department: p.faculty_department?.trim() || '',
        fullName: p.full_name,
        email: p.email,
      }))
      .filter((r) => r.department)
      .sort((a, b) =>
        a.department.localeCompare(b.department) || a.fullName.localeCompare(b.fullName)
      );
  }, [profiles]);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-base text-gray-500 mt-1">
            Departments under your handled college and their current users.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
          ) : null}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Handling College</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-900" />
              {college?.name || profile?.department || 'Not assigned yet'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                      No departments found for this college yet.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={`${d.department}-${d.email}`} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{d.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{d.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{d.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
