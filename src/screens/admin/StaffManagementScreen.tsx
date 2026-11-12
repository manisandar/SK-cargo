import React, { useState, useEffect, useCallback } from 'react';
import { useRepository, StaffUser } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { strings } from '../../strings';
import {
  Users,
  Plus,
  Edit2,
  Shield,
  UserCheck,
  X,
  Loader2,
  Check,
  ChevronDown,
} from 'lucide-react';

export const StaffManagementScreen: React.FC = () => {
  const repository = useRepository();
  const { user: currentUser } = useAuth();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repository.getStaffUsers();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleOpenCreate = () => {
    setUsername('');
    setName('');
    setRole('staff');
    setPassword('staff123');
    setIsActive(true);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setUsername(staff.username);
    setName(staff.name);
    setRole(staff.role);
    setPassword('');
    setIsActive(staff.is_active !== false);
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setFormError('Username and Display Name are required.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await repository.createStaffUser({
        username: username.trim(),
        name: name.trim(),
        role,
        password: password.trim() || 'staff123',
      });
      setIsCreateModalOpen(false);
      await loadStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create staff account';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!name.trim()) {
      setFormError('Display Name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await repository.updateStaffUser(editingStaff.id, {
        name: name.trim(),
        role,
        password: password.trim() ? password.trim() : undefined,
        is_active: isActive,
      });
      setEditingStaff(null);
      await loadStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update staff account';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E75BB] dark:text-[#2D8AD1]" />
            <span>{strings.admin.staffManagementTitle}</span>
          </h2>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {strings.admin.staffManagementSubtitle}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 min-h-[38px] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{strings.admin.addNewStaffButton}</span>
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>Loading staff directory...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            No staff accounts recorded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {staffList.map((staff) => {
            const isSelf = staff.id === currentUser?.id;
            const isAdmin = staff.role === 'admin';
            const isActiveAccount = staff.is_active !== false;

            return (
              <div
                key={staff.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isAdmin
                            ? 'bg-blue-100 text-[#1E75BB] dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isAdmin ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {staff.name}
                          </h3>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          @{staff.username}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isAdmin
                          ? 'bg-blue-50 text-[#1E75BB] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isAdmin ? strings.auth.roleAdmin : strings.auth.roleStaff}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Account Status:</span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        isActiveAccount
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500 dark:text-rose-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActiveAccount ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      ></span>
                      <span>{isActiveAccount ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenEdit(staff)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 min-h-[34px]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Staff Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1E75BB]" />
                <span>{strings.admin.createStaffTitle}</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.admin.usernameLabel} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. staff3 or manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.admin.displayNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Lin or Aung Aung"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.admin.roleLabel}
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] cursor-pointer"
                  >
                    <option value="staff">{strings.auth.roleStaff}</option>
                    <option value="admin">{strings.auth.roleAdmin}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.admin.passwordLabel}
                </label>
                <input
                  type="password"
                  placeholder="Temporary password (default: staff123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold min-h-[40px]"
                >
                  {strings.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[40px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#1E75BB]" />
                <span>{strings.admin.editStaffTitle}</span>
              </h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username (@{editingStaff.username})
                </label>
                <input
                  type="text"
                  disabled
                  value={editingStaff.username}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.admin.displayNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.admin.roleLabel}
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
                    disabled={editingStaff.id === currentUser?.id}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:border-[#1E75BB] cursor-pointer"
                  >
                    <option value="staff">{strings.auth.roleStaff}</option>
                    <option value="admin">{strings.auth.roleAdmin}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {editingStaff.id === currentUser?.id && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    You cannot change your own admin role.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              {editingStaff.id !== currentUser?.id && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-[#1E75BB] focus:ring-[#1E75BB]"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Active Account (uncheck to deactivate access)
                    </span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold min-h-[40px]"
                >
                  {strings.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[40px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{strings.common.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
