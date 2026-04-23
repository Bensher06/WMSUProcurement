import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PROFILE_MIDDLE_INITIAL_MAX_LEN } from '../lib/profileConstants';
import { evaluatePassword } from '../lib/passwordRules';
import { normalizeUserRole } from '../lib/roles';
import {
  auditAPI,
  authAPI,
  collegesAPI,
  departmentsAPI,
  profilesAPI,
  profilesQueryAPI,
  requestsAPI,
} from '../lib/supabaseApi';
import {
  displayRequesterFacultyDepartment,
  type College,
  type Department,
  type Profile,
  type RequestWithRelations,
} from '../types/database';
import {
  Ban,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type DepartmentSummary = {
  name: string;
  users: Profile[];
  contact: Profile | null;
  requestCount: number;
  pendingCount: number;
  activeCount: number;
  totalRequested: number;
};

const peso = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

const composeFullName = (first: string, mid: string, last: string) =>
  [first.trim(), mid.trim(), last.trim()].filter(Boolean).join(' ');

const generateAutoPassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const random = new Uint32Array(length);
    cryptoObj.getRandomValues(random);
    for (let i = 0; i < length; i += 1) {
      out += chars[random[i] % chars.length];
    }
    return out;
  }
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

export default function DeptHeadDepartments() {
  const { profile } = useAuth();
  const [college, setCollege] = useState<College | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [managedDepartments, setManagedDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [accountForm, setAccountForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    departmentId: '',
    password: generateAutoPassword(),
  });

  const accountPwRules = useMemo(() => evaluatePassword(accountForm.password), [accountForm.password]);
  const accountPasswordValid =
    accountPwRules.length && accountPwRules.uppercase && accountPwRules.number;

  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    middle: '',
    lastName: '',
    departmentId: '',
  });
  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const [suspendConfirmEmail, setSuspendConfirmEmail] = useState('');
  const [resendBusyId, setResendBusyId] = useState<string | null>(null);

  const canManageDepartmentUser = (u: Profile) => {
    if (!college?.name || !profile?.id) return false;
    if (u.id === profile.id) return false;
    if (normalizeUserRole(u.role) !== 'Faculty') return false;
    return (u.department || '').trim() === college.name.trim();
  };

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
          setRequests([]);
          return;
        }
        const [rows, reqRows] = await Promise.all([
          profilesQueryAPI.getByDepartment(handled.name),
          requestsAPI.getForHandledCollege(profile.id).then((r) => r.requests),
        ]);
        const deptRows = await departmentsAPI.getByCollegeId(handled.id, false);
        if (!mounted) return;
        setProfiles(rows);
        setRequests(reqRows);
        setManagedDepartments(deptRows);
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

  const reloadCollegeData = async () => {
    if (!profile?.id || !college?.name || !college?.id) return;
    const [rows, reqRows, deptRows] = await Promise.all([
      profilesQueryAPI.getByDepartment(college.name),
      requestsAPI.getForHandledCollege(profile.id).then((r) => r.requests),
      departmentsAPI.getByCollegeId(college.id, false),
    ]);
    setProfiles(rows);
    setRequests(reqRows);
    setManagedDepartments(deptRows);
  };

  const createDepartment = async () => {
    if (!college?.id) return;
    const name = newDepartment.trim();
    if (!name) {
      setError('Department name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await departmentsAPI.create({ college_id: college.id, name, is_active: true });
      await reloadCollegeData();
      setNewDepartment('');
      setSuccess('Department created.');
    } catch (e: any) {
      setError(e?.message || 'Failed to create department.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDepartment = async (row: Department) => {
    if (row.is_active) {
      const userCount = profiles.filter((p) => (p.faculty_department || '').trim() === row.name.trim()).length;
      if (userCount > 0) {
        const ok = window.confirm(
          `“${row.name}” has ${userCount} assigned user(s). Inactive departments should not receive new accounts. Continue marking it inactive?`
        );
        if (!ok) return;
      }
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await departmentsAPI.update(row.id, { is_active: !row.is_active });
      await reloadCollegeData();
      setSuccess('Department updated.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update department.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (row: Department) => {
    const deptName = row.name.trim();
    const assignedUsers = profiles.filter(
      (p) => (p.faculty_department || '').trim() === deptName
    ).length;
    const deptRequests = requests.filter(
      (r) => displayRequesterFacultyDepartment(r) === deptName
    ).length;

    let prompt = `Delete department "${row.name}"? This cannot be undone.`;
    if (assignedUsers > 0 || deptRequests > 0) {
      prompt += `\n\nThis department currently has ${assignedUsers} assigned user(s) and ${deptRequests} request record(s).`;
      prompt += '\nDelete only if you are sure this department is no longer needed.';
    }

    const ok = window.confirm(prompt);
    if (!ok) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await departmentsAPI.delete(row.id);
      if (expandedDepartment === row.name) setExpandedDepartment(null);
      await reloadCollegeData();
      setSuccess('Department deleted.');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete department.');
    } finally {
      setSaving(false);
    }
  };

  const createDepartmentUser = async () => {
    if (!college?.name) return;
    const firstName = accountForm.firstName.trim();
    const middleName = accountForm.middleName.trim();
    const lastName = accountForm.lastName.trim();
    const email = accountForm.email.trim();
    const password = accountForm.password;
    const selectedDepartment = managedDepartments.find(
      (d) => d.id === accountForm.departmentId && d.is_active
    );

    if (!firstName || !lastName) {
      setError('First name and last name are required.');
      return;
    }
    if (!selectedDepartment) {
      setError('Select an active department.');
      return;
    }
    if (!email) {
      setError('Email address is required.');
      return;
    }
    if (!accountPasswordValid) {
      setError(
        'Password must be at least 8 characters and include at least one uppercase letter and one number.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const authData = await authAPI.signUp(
        email,
        password,
        { firstName, middleName, lastName },
        'Faculty',
        college.name
      );
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      if (authData?.user?.id) {
        await profilesAPI.update(authData.user.id, {
          full_name: fullName,
          first_name: firstName,
          middle_initial: middleName || null,
          family_name: lastName,
          role: 'Faculty',
          department: college.name,
          faculty_department: selectedDepartment.name,
          faculty_department_id: selectedDepartment.id,
          status: 'Approved',
        });
        await auditAPI.insert({
          event_type: 'faculty_account_created_by_college_admin',
          entity: 'profiles',
          entity_id: authData.user.id,
          details: {
            college: college.name,
            email,
            department: selectedDepartment.name,
          },
        });
      }
      await reloadCollegeData();
      setShowAccountModal(false);
      setAccountForm({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        departmentId: '',
        password: generateAutoPassword(),
      });
      setSuccess('Department account created.');
    } catch (e: any) {
      setError(e?.message || 'Failed to create department account.');
    } finally {
      setSaving(false);
    }
  };

  const openEditUser = (u: Profile) => {
    setEditTarget(u);
    const matchDept = managedDepartments.find(
      (d) => d.id === u.faculty_department_id || d.name.trim() === (u.faculty_department || '').trim()
    );
    setEditForm({
      firstName: (u.first_name || '').trim() || (u.full_name || '').split(/\s+/)[0] || '',
      middle: (u.middle_initial || '').trim(),
      lastName: (u.family_name || '').trim() || (u.full_name || '').split(/\s+/).slice(-1)[0] || '',
      departmentId: matchDept?.id || '',
    });
  };

  const saveEditUser = async () => {
    if (!editTarget || !college?.name) return;
    const dept = managedDepartments.find((d) => d.id === editForm.departmentId && d.is_active);
    if (!dept) {
      setError('Select an active department for this user.');
      return;
    }
    const fn = editForm.firstName.trim();
    const ln = editForm.lastName.trim();
    if (!fn || !ln) {
      setError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const mid = editForm.middle.trim().slice(0, PROFILE_MIDDLE_INITIAL_MAX_LEN) || null;
      const full = composeFullName(fn, mid || '', ln);
      await profilesAPI.update(editTarget.id, {
        first_name: fn,
        middle_initial: mid,
        family_name: ln,
        full_name: full,
        faculty_department: dept.name,
        faculty_department_id: dept.id,
      });
      await auditAPI.insert({
        event_type: 'faculty_profile_updated_by_college_admin',
        entity: 'profiles',
        entity_id: editTarget.id,
        details: { college: college.name, target_email: editTarget.email },
      });
      setEditTarget(null);
      await reloadCollegeData();
      setSuccess('User updated.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const suspendConfirmOk =
    !!suspendTarget &&
    suspendConfirmEmail.trim().toLowerCase() === (suspendTarget.email || '').trim().toLowerCase();

  const applySuspendUser = async () => {
    if (!suspendTarget || !suspendConfirmOk || !college?.name || !profile?.id) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profilesAPI.update(suspendTarget.id, { status: 'Suspended' });
      await auditAPI.insert({
        event_type: 'faculty_access_suspended',
        entity: 'profiles',
        entity_id: suspendTarget.id,
        details: {
          college: college.name,
          actor_college_admin: profile.id,
          target_email: suspendTarget.email,
        },
      });
      setSuspendTarget(null);
      setSuspendConfirmEmail('');
      await reloadCollegeData();
      setSuccess('User access suspended. They cannot sign in while suspended.');
    } catch (e: any) {
      setError(e?.message || 'Failed to suspend user.');
    } finally {
      setSaving(false);
    }
  };

  const restoreUser = async (u: Profile) => {
    if (!canManageDepartmentUser(u) || !college?.name) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profilesAPI.update(u.id, { status: 'Approved' });
      await auditAPI.insert({
        event_type: 'faculty_access_restored',
        entity: 'profiles',
        entity_id: u.id,
        details: { college: college.name, target_email: u.email },
      });
      await reloadCollegeData();
      setSuccess('User access restored.');
    } catch (e: any) {
      setError(e?.message || 'Failed to restore user.');
    } finally {
      setSaving(false);
    }
  };

  const resendPasswordSetup = async (u: Profile) => {
    if (!canManageDepartmentUser(u) || !u.email) return;
    setResendBusyId(u.id);
    setError('');
    setSuccess('');
    try {
      await authAPI.resetPassword(u.email);
      await auditAPI.insert({
        event_type: 'faculty_password_reset_invite_sent',
        entity: 'profiles',
        entity_id: u.id,
        details: { college: college?.name, target_email: u.email },
      });
      setSuccess(`Password reset email sent to ${u.email}.`);
    } catch (e: any) {
      setError(e?.message || 'Could not send reset email.');
    } finally {
      setResendBusyId(null);
    }
  };

  const departments = useMemo<DepartmentSummary[]>(() => {
    const profileMap = new Map<string, Profile[]>();
    profiles.forEach((p) => {
      const department = p.faculty_department?.trim() || '';
      if (!department) return;
      if (!profileMap.has(department)) profileMap.set(department, []);
      profileMap.get(department)!.push(p);
    });

    const committedStatuses = ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'];
    const names = new Set<string>();
    managedDepartments.forEach((d) => names.add(d.name.trim()));
    Array.from(profileMap.keys()).forEach((name) => names.add(name));

    return Array.from(names)
      .filter(Boolean)
      .map((name) => {
        const users = profileMap.get(name) || [];
        const departmentRequests = requests.filter(
          (r) => displayRequesterFacultyDepartment(r) === name
        );
        const contact =
          users.find((u) => u.role === 'DeptHead') ||
          users.slice().sort((a, b) => a.full_name.localeCompare(b.full_name))[0] ||
          null;
        return {
          name,
          users: users.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)),
          contact,
          requestCount: departmentRequests.length,
          pendingCount: departmentRequests.filter((r) => r.status === 'Pending').length,
          activeCount: departmentRequests.filter((r) => committedStatuses.includes(r.status)).length,
          totalRequested: departmentRequests.reduce((sum, r) => sum + Number(r.total_price || 0), 0),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [managedDepartments, profiles, requests]);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-base text-gray-500 mt-1">
            Expand a department to inspect users, request load, and budget demand.
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
          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">{success}</div>
          ) : null}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Handling College</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-900" />
              {college?.name || profile?.department || 'Not assigned yet'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Department Directory</h2>
              <p className="text-sm text-gray-500">
                Create and manage departments for your handled college. User assignment uses this list.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Enter new department name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <button
                type="button"
                onClick={() => void createDepartment()}
                disabled={saving || !college?.id}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add department
              </button>
            </div>
            <div className="space-y-2">
              {managedDepartments.length === 0 ? (
                <p className="text-sm text-gray-500">No departments yet.</p>
              ) : (
                managedDepartments.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void toggleDepartment(d)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {d.is_active ? 'Set inactive' : 'Set active'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void deleteDepartment(d)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-red-200 bg-red-50 text-red-900 hover:bg-red-100 disabled:opacity-50"
                        title={`Delete ${d.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setShowAccountPassword(false);
                  setShowAccountModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800"
              >
                <Plus className="w-4 h-4" />
                Add department account
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requests</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Budget Demand</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Details</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No departments found for this college yet.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => {
                    const isOpen = expandedDepartment === d.name;
                    return (
                      <Fragment key={d.name}>
                        <tr className="border-t border-gray-100">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {d.contact?.full_name || 'No contact assigned'}
                            {d.contact?.email ? (
                              <span className="block text-xs text-gray-500">{d.contact.email}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span className="font-medium">{d.requestCount}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              Pending {d.pendingCount} · Active {d.activeCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{peso(d.totalRequested)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDepartment((prev) => (prev === d.name ? null : d.name))
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {isOpen ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="border-t border-gray-100 bg-gray-50/70">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-600 uppercase">
                                  Department Users ({d.users.length})
                                </p>
                                {d.users.length === 0 ? (
                                  <p className="text-sm text-gray-500">No users assigned yet.</p>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex justify-end">
                                      <Link
                                        to={`/dept-head/request-history?department=${encodeURIComponent(d.name)}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-50"
                                      >
                                        Open requests for this department
                                      </Link>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {d.users.map((u) => {
                                        const st = u.status || 'Approved';
                                        const manage = canManageDepartmentUser(u);
                                        return (
                                          <div
                                            key={u.id}
                                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                          >
                                            <p className="font-medium text-gray-900">
                                              {u.full_name ||
                                                [u.first_name, u.middle_initial, u.family_name]
                                                  .filter(Boolean)
                                                  .join(' ') ||
                                                '—'}
                                            </p>
                                            <p className="text-gray-600">{u.email}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              Role: {u.role} · Access: {st}
                                            </p>
                                            {manage ? (
                                              <div className="mt-2 flex flex-wrap gap-1.5">
                                                <button
                                                  type="button"
                                                  disabled={saving}
                                                  onClick={() => openEditUser(u)}
                                                  className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={saving || resendBusyId === u.id}
                                                  onClick={() => void resendPasswordSetup(u)}
                                                  className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                  <Mail className="h-3.5 w-3.5" />
                                                  {resendBusyId === u.id ? 'Sending…' : 'Reset email'}
                                                </button>
                                                {st === 'Suspended' ? (
                                                  <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => void restoreUser(u)}
                                                    className="inline-flex items-center gap-1 rounded border border-green-600 bg-green-50 px-2 py-1 text-xs font-medium text-green-900 hover:bg-green-100 disabled:opacity-50"
                                                  >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Restore access
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => {
                                                      setSuspendTarget(u);
                                                      setSuspendConfirmEmail('');
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
                                                  >
                                                    <Ban className="h-3.5 w-3.5" />
                                                    Suspend
                                                  </button>
                                                )}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {showAccountModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="presentation"
          onClick={() => !saving && setShowAccountModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dept-account-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 id="dept-account-title" className="text-lg font-semibold text-gray-900">
                Add department account
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowAccountModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={accountForm.firstName}
                  onChange={(e) => setAccountForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="First name"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                />
                <input
                  value={accountForm.middleName}
                  onChange={(e) => setAccountForm((p) => ({ ...p, middleName: e.target.value }))}
                  placeholder="Middle name (optional)"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                />
              </div>
              <input
                value={accountForm.lastName}
                onChange={(e) => setAccountForm((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Last name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <input
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              />
              <select
                value={accountForm.departmentId}
                onChange={(e) => setAccountForm((p) => ({ ...p, departmentId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
              >
                <option value="">Select department</option>
                {managedDepartments
                  .filter((d) => d.is_active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Lock className="w-4 h-4 inline mr-1.5 align-text-bottom" />
                  Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type={showAccountPassword ? 'text' : 'password'}
                      value={accountForm.password}
                      onChange={(e) => setAccountForm((p) => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                      minLength={8}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    />
                    <button
                      type="button"
                      aria-label={showAccountPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowAccountPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                    >
                      {showAccountPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccountForm((p) => ({ ...p, password: generateAutoPassword() }))}
                    className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Regenerate
                  </button>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs">
                  <li className={accountPwRules.length ? 'text-green-700' : 'text-gray-500'}>
                    • At least 8 characters
                  </li>
                  <li className={accountPwRules.uppercase ? 'text-green-700' : 'text-gray-500'}>
                    • At least 1 uppercase letter (A–Z)
                  </li>
                  <li className={accountPwRules.number ? 'text-green-700' : 'text-gray-500'}>
                    • At least 1 number (0–9)
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                Enter your own password or use Regenerate. This creates a Department user under{' '}
                <span className="font-medium">{college?.name || 'your college'}</span>.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !accountPasswordValid}
                onClick={() => void createDepartmentUser()}
                className="px-4 py-2 text-sm bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => !saving && setEditTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit department user</h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
                />
                <input
                  value={editForm.middle}
                  onChange={(e) => setEditForm((f) => ({ ...f, middle: e.target.value }))}
                  maxLength={PROFILE_MIDDLE_INITIAL_MAX_LEN}
                  placeholder="Middle (optional)"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
                />
              </div>
              <input
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Last name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
              />
              <p className="text-xs text-gray-600">
                Sign-in email: <span className="font-mono text-gray-900">{editTarget.email}</span> — only the user
                (Account page) or WMSU Admin can change it.
              </p>
              <select
                value={editForm.departmentId}
                onChange={(e) => setEditForm((f) => ({ ...f, departmentId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
              >
                <option value="">Select active department</option>
                {managedDepartments
                  .filter((dep) => dep.is_active)
                  .map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500">
                Only <span className="font-medium">active</span> departments can be assigned. Inactive departments
                cannot receive new accounts from the form above.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditTarget(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEditUser()}
                className="rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {suspendTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => !saving && (setSuspendTarget(null), setSuspendConfirmEmail(''))}
        >
          <div
            className="w-full max-w-md rounded-xl border border-red-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-red-950">Suspend user access</h2>
              <p className="mt-2 text-sm text-gray-600">
                This revokes sign-in for <span className="font-semibold text-gray-900">{suspendTarget.email}</span>.
                They remain in the directory for audit purposes; use Restore access to allow them again.
              </p>
              <p className="mt-3 text-sm font-medium text-gray-800">
                Type their email exactly to confirm:
              </p>
              <input
                value={suspendConfirmEmail}
                onChange={(e) => setSuspendConfirmEmail(e.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-600"
                placeholder={suspendTarget.email || ''}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setSuspendTarget(null);
                  setSuspendConfirmEmail('');
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !suspendConfirmOk}
                onClick={() => void applySuspendUser()}
                className="rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? 'Working…' : 'Suspend access'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
