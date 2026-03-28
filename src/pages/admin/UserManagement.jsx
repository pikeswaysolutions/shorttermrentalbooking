import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { format } from 'date-fns';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

const UserManagement = () => {
  const { session, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const headers = {
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
    Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) fetchUsers();
  }, [session?.access_token, fetchUsers]);

  const handleDelete = async (userId) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/${userId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage admin users who can access this dashboard
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={FiIcons.FiUserPlus}>
          Add User
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-start gap-3">
          <SafeIcon icon={FiIcons.FiAlertCircle} className="mt-0.5 flex-shrink-0" />
          <div>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-800 font-bold text-xs mt-1 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading team members...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <SafeIcon icon={FiIcons.FiUsers} className="text-4xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No admin users found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <SafeIcon icon={FiIcons.FiUser} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 truncate">{u.email}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    <span>Admin</span>
                    <span className="hidden sm:inline">|</span>
                    <span>
                      Joined{' '}
                      {u.created_at
                        ? format(new Date(u.created_at), 'MMM d, yyyy')
                        : 'Unknown'}
                    </span>
                    {u.last_sign_in_at && (
                      <>
                        <span className="hidden sm:inline">|</span>
                        <span>
                          Last login{' '}
                          {format(new Date(u.last_sign_in_at), 'MMM d, yyyy')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {u.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(u)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0 self-end sm:self-center"
                >
                  <SafeIcon icon={FiIcons.FiTrash2} className="mr-1" />
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddUserModal
          headers={headers}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiIcons.FiAlertTriangle} className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Remove User</h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to remove{' '}
                <span className="font-bold">{deleteConfirm.email}</span>? They
                will lose all access to the admin dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirm.id)}
                isLoading={deleting}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddUserModal = ({ headers, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 14; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pw);
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Add Admin User</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a new account with admin access
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SafeIcon icon={FiIcons.FiX} className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs text-primary font-bold hover:underline"
              >
                Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <SafeIcon
                  icon={showPassword ? FiIcons.FiEyeOff : FiIcons.FiEye}
                  className="text-lg"
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Share these credentials securely with the new user. They can change
              their password after logging in.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={loading}>
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
