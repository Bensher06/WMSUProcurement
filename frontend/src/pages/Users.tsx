import { useState, useEffect } from 'react';
import { profilesAPI, authAPI } from '../lib/supabaseApi';
import type { Profile, UserRole } from '../types/database';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  User,
  Mail,
  Shield,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Faculty' as UserRole,
    approved_budget: '' as string
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await profilesAPI.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      if (editingUser) {
        // Update existing user
        await profilesAPI.update(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role,
          approved_budget: formData.approved_budget === '' ? null : parseFloat(formData.approved_budget)
        });
        setSuccess('User updated successfully');
      } else {
        // Create new user
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setSubmitting(false);
          return;
        }
        
        await authAPI.signUp(
          formData.email,
          formData.password,
          formData.full_name,
          formData.role
        );
        setSuccess('User created successfully. They can now sign in with their email and password.');
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      approved_budget: user.approved_budget != null ? String(user.approved_budget) : ''
    });
    setShowModal(true);
  };

  const handleResetPassword = async (user: Profile) => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    
    try {
      await authAPI.resetPassword(user.email);
      setSuccess(`Password reset email sent to ${user.email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await profilesAPI.delete(id);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', password: '', role: 'Faculty', approved_budget: '' });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-700';
      case 'DeptHead': return 'bg-purple-100 text-purple-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">Users</h1>
          <p className="text-base text-gray-500 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create User
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-900 font-semibold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-wmsu-black">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Reset Password"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-wmsu-black">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!!editingUser}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 ${
                    editingUser ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  required
                />
                {editingUser && (
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                      placeholder="Leave empty to keep current password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Send password reset email to ${editingUser.email}?`)) {
                          try {
                            await authAPI.resetPassword(editingUser.email);
                            setSuccess(`Password reset email sent to ${editingUser.email}`);
                          } catch (err: any) {
                            setError(err.message || 'Failed to send password reset email');
                          }
                        }
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                    >
                      Send Reset Email
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter new password or use "Send Reset Email" to let user reset it themselves
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                >
                  <option value="Faculty">Faculty</option>
                  <option value="DeptHead">Department Head</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approved budget (₱) — for Faculty
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.approved_budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, approved_budget: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    placeholder="e.g. 50000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Amount shown to this user as &quot;Your approved budget&quot; on their dashboard. Leave empty if not set.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-600 hover:text-wmsu-black disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingUser ? 'Update User' : 'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

