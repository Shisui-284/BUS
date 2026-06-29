// ============================================================================
// ADMIN USERS PAGE — Quản lý tài khoản (Admin)
// Tính năng: CRUD user, khóa/mở khóa, reset password
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Pencil, Lock, Unlock, Key, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getUsers,
  createUser,
  updateUser,
  lockUnlockUser,
  resetUserPassword,
  deleteUser,
  AdminUser,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";
import Pagination from "../../components/ui/Pagination";
import { UserRole } from "../../types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "CUSTOMER", label: "Khách hàng" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "ADMIN", label: "Admin" },
  { value: "CUSTOMER", label: "Khách hàng" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "LOCKED", label: "Bị khóa" },
  { value: "INACTIVE", label: "Đã xóa" },
];

const EMPLOYEE_TYPE_OPTIONS = [
  { value: "DRIVER", label: "Tài xế" },
  { value: "ASSISTANT", label: "Phụ xe" },
  { value: "DISPATCHER", label: "Điều phối" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "TECHNICIAN", label: "Kỹ thuật" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadUsers = useCallback(() => {
    setIsLoading(true);

    getUsers({
      keyword: keyword || undefined,
      role: filterRole || undefined,
      status: filterStatus || undefined,
    })
      .then((data) => {
        setUsers(data);
        setCurrentPage(1);
      })
      .catch((err) => toast.error(extractApiErrorMessage(err) || "Không thể tải danh sách người dùng"))
      .finally(() => setIsLoading(false));
  }, [keyword, filterRole, filterStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedUsers = users.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const handleCreate = async (form: CreateForm) => {
    setIsSaving(true);

    try {
      await createUser({
        username: form.username,
        password: form.password,
        email: form.email,
        phone: form.phone,
        role: form.role,
      });

      toast.success("Tạo tài khoản thành công");
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (form: EditForm) => {
    if (!selectedUser) return;

    setIsSaving(true);

    try {
      await updateUser(selectedUser.id, {
        email: form.email,
        phone: form.phone,
        fullName: form.fullName,
        employeeType: form.employeeType,
      });

      toast.success("Cập nhật thông tin thành công");
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockUnlock = async (user: AdminUser) => {
    if (user.status === "INACTIVE") {
      toast.error("Tài khoản đã xóa không thể khóa hoặc mở khóa");
      return;
    }

    try {
      const updated = await lockUnlockUser(user.id);

      toast.success(
        updated.status === "LOCKED"
          ? `Đã khóa tài khoản ${user.username}`
          : `Đã mở khóa tài khoản ${user.username}`
      );

      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  const handleResetPassword = async (id: number, newPassword: string) => {
    try {
      await resetUserPassword(id, newPassword);

      toast.success("Đổi mật khẩu thành công");
      setShowPasswordModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.status === "INACTIVE") {
      toast.error("Tài khoản này đã bị xóa");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tài khoản "${user.username}" không?`
    );

    if (!confirmed) return;

    try {
      await deleteUser(user.id);

      toast.success(`Đã xóa tài khoản ${user.username}`);
      loadUsers();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="admin-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              Account Management
            </p>
            <h1 className="admin-title text-3xl">Quản lý tài khoản</h1>
            <p className="admin-subtitle mt-2 text-sm">
              Quản lý tài khoản admin, nhân viên và khách hàng trong hệ thống.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            Tạo tài khoản
          </button>
        </div>
      </div>

      <div className="admin-panel flex flex-wrap items-center gap-3 p-4">
        <div className="admin-input flex min-w-[260px] flex-1 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm tên đăng nhập, email..."
            className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400 focus:shadow-none"
          />
        </div>

        <select
          value={filterRole}
          onChange={(event) => setFilterRole(event.target.value)}
          className="admin-select px-3 py-2 text-sm outline-none"
        >
          {ROLE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="admin-select px-3 py-2 text-sm outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4">Tài khoản</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Vai trò</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Loại nhân sự</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Không có người dùng nào
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                          {user.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{user.username}</p>
                          <p className="text-xs text-slate-400">{user.fullName || "—"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">{user.email || "—"}</td>

                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={user.status} />
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {user.employeeType || "—"}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          title="Sửa"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          title={user.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                          disabled={user.status === "INACTIVE"}
                          onClick={() => handleLockUnlock(user)}
                          variant="warning"
                        >
                          {user.status === "LOCKED" ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </ActionButton>

                        <ActionButton
                          title="Đổi mật khẩu"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          variant="info"
                        >
                          <Key className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          title="Xóa tài khoản"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => handleDeleteUser(user)}
                          variant="danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="border-t border-slate-100 bg-slate-50/50">
            <Pagination 
              currentPage={validCurrentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSaving={isSaving}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleEdit}
          isSaving={isSaving}
        />
      )}

      {showPasswordModal && selectedUser && (
        <ResetPasswordModal
          username={selectedUser.username}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          onSubmit={(password) => handleResetPassword(selectedUser.id, password)}
        />
      )}
    </div>
  );
}

function ActionButton({
  title,
  disabled,
  onClick,
  children,
  variant = "default",
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "warning" | "info" | "danger";
}) {
  const variants: Record<string, string> = {
    default: "hover:bg-blue-50 hover:text-blue-600",
    warning: "hover:bg-amber-50 hover:text-amber-600",
    info: "hover:bg-purple-50 hover:text-purple-600",
    danger: "hover:bg-red-50 hover:text-red-600",
  };

  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl p-2 text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: "badge-danger",
    CUSTOMER: "badge-success",
  };

  const labels: Record<string, string> = {
    ADMIN: "Admin",
    CUSTOMER: "Khách hàng",
  };

  return (
    <span className={`badge ${styles[role] ?? "bg-slate-100 text-slate-600"}`}>
      {labels[role] ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "badge-success",
    LOCKED: "badge-warning",
    INACTIVE: "badge-danger",
  };

  const labels: Record<string, string> = {
    ACTIVE: "Hoạt động",
    LOCKED: "Bị khóa",
    INACTIVE: "Đã xóa",
  };

  return (
    <span className={`badge ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

interface CreateForm {
  username: string;
  password: string;
  email: string;
  phone: string;
  role: UserRole;
}

function CreateUserModal({
  onClose,
  onSubmit,
  isSaving,
}: {
  onClose: () => void;
  onSubmit: (form: CreateForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    username: "",
    password: "",
    email: "",
    phone: "",
    role: "ADMIN",  // legacy - no longer selectable
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title="Tạo tài khoản mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Tên đăng nhập" required>
          <input
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
            required
            minLength={3}
          />
        </FormField>

        <FormField label="Mật khẩu" required>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
            required
            minLength={8}
          />
        </FormField>

        <FormField label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
            required
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
          />
        </FormField>

        <FormField label="Vai trò" required>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
            className="admin-select w-full px-3 py-2 text-sm outline-none"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary px-4 py-2 text-sm"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="admin-button-primary px-4 py-2 text-sm"
          >
            {isSaving ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface EditForm {
  email: string;
  phone: string;
  fullName: string;
  employeeType: string;
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
  isSaving,
}: {
  user: AdminUser;
  onClose: () => void;
  onSubmit: (form: EditForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditForm>({
    email: user.email || "",
    phone: user.phone || "",
    fullName: user.fullName || "",
    employeeType: user.employeeType || "",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title={`Sửa tài khoản: ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
          />
        </FormField>

        <FormField label="Họ tên">
          <input
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
          />
        </FormField>

        <FormField label="Loại nhân sự">
          <select
            value={form.employeeType}
            onChange={(event) => setForm({ ...form, employeeType: event.target.value })}
            className="admin-select w-full px-3 py-2 text-sm outline-none"
          >
            <option value="">— Không xác định —</option>
            {EMPLOYEE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary px-4 py-2 text-sm"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="admin-button-primary px-4 py-2 text-sm"
          >
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  username,
  onClose,
  onSubmit,
}: {
  username: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (password.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    onSubmit(password);
  };

  return (
    <Modal title={`Đổi mật khẩu: ${username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Mật khẩu mới" required>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
            required
            minLength={8}
          />
        </FormField>

        <FormField label="Xác nhận mật khẩu" required>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="admin-input w-full px-3 py-2 text-sm outline-none"
            required
            minLength={8}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary px-4 py-2 text-sm"
          >
            Hủy
          </button>

          <button
            type="submit"
            className="admin-button-primary px-4 py-2 text-sm"
          >
            Đổi mật khẩu
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="admin-modal w-full max-w-lg p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}