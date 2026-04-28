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
import { UserRole } from "../../types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Nhân viên" },
  { value: "CUSTOMER", label: "Khách hàng" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Nhân viên" },
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

  const loadUsers = useCallback(() => {
    setIsLoading(true);

    getUsers({
      keyword: keyword || undefined,
      role: filterRole || undefined,
      status: filterStatus || undefined,
    })
      .then(setUsers)
      .catch((err) => toast.error(extractApiErrorMessage(err) || "Không thể tải danh sách người dùng"))
      .finally(() => setIsLoading(false));
  }, [keyword, filterRole, filterStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý tài khoản</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý tài khoản nhân viên và khách hàng trong hệ thống
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0F2849] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a3a6b]"
        >
          <Plus className="h-4 w-4" />
          Tạo tài khoản
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm tên đăng nhập, email..."
            className="w-64 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <select
          value={filterRole}
          onChange={(event) => setFilterRole(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tài khoản</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Vai trò</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Loại nhân sự</th>
                <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Đang tải...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Không có người dùng nào
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{user.username}</p>
                      <p className="text-xs text-slate-400">{user.fullName || "—"}</p>
                    </td>

                    <td className="px-4 py-3 text-slate-600">{user.email || "—"}</td>

                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {user.employeeType || "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Sửa"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          title={user.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                          disabled={user.status === "INACTIVE"}
                          onClick={() => handleLockUnlock(user)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {user.status === "LOCKED" ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          title="Đổi mật khẩu"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Key className="h-4 w-4" />
                        </button>

                        <button
                          title="Xóa tài khoản"
                          disabled={user.status === "INACTIVE"}
                          onClick={() => handleDeleteUser(user)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    STAFF: "bg-blue-100 text-blue-700",
    CUSTOMER: "bg-emerald-100 text-emerald-700",
  };

  const labels: Record<string, string> = {
    ADMIN: "Admin",
    STAFF: "Nhân viên",
    CUSTOMER: "Khách hàng",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        styles[role] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[role] ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    LOCKED: "bg-amber-100 text-amber-700",
    INACTIVE: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    ACTIVE: "Hoạt động",
    LOCKED: "Bị khóa",
    INACTIVE: "Đã xóa",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
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
    role: "STAFF",
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
            minLength={3}
          />
        </FormField>

        <FormField label="Mật khẩu" required>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
            minLength={8}
          />
        </FormField>

        <FormField label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </FormField>

        <FormField label="Vai trò" required>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a6b] disabled:opacity-60"
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </FormField>

        <FormField label="Họ tên">
          <input
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </FormField>

        <FormField label="Loại nhân sự">
          <select
            value={form.employeeType}
            onChange={(event) => setForm({ ...form, employeeType: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a6b] disabled:opacity-60"
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
            minLength={8}
          />
        </FormField>

        <FormField label="Xác nhận mật khẩu" required>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
            minLength={8}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Hủy
          </button>

          <button
            type="submit"
            className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a6b]"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}