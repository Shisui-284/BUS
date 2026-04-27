import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getBuses,
  createBus,
  updateBus,
  updateBusStatus,
  AdminBus,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

const BUS_TYPE_OPTIONS = [
  { value: "SLEEPER", label: "Giường nằm (Sleeper)" },
  { value: "SEAT", label: "Ghế ngồi (Seat)" },
  { value: "LIMOUSINE", label: "Limousine" },
];

const BUS_STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "AVAILABLE", label: "Sẵn sàng" },
  { value: "RUNNING", label: "Đang chạy" },
  { value: "MAINTENANCE", label: "Bảo trì" },
];

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  RUNNING: "bg-blue-100 text-blue-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  RUNNING: "Đang chạy",
  MAINTENANCE: "Bảo trì",
};

const BUS_TYPE_LABELS: Record<string, string> = {
  SLEEPER: "Giường nằm",
  SEAT: "Ghế ngồi",
  LIMOUSINE: "Limousine",
};

export default function AdminBusesPage() {
  const [buses, setBuses] = useState<AdminBus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<AdminBus | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadBuses = useCallback(() => {
    setIsLoading(true);
    getBuses({
      keyword: keyword || undefined,
      status: filterStatus || undefined,
    })
      .then(setBuses)
      .catch(() => toast.error("Không thể tải danh sách xe"))
      .finally(() => setIsLoading(false));
  }, [keyword, filterStatus]);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const handleCreate = async (form: CreateForm) => {
    setIsSaving(true);
    try {
      await createBus({
        licensePlate: form.licensePlate,
        busType: form.busType,
        totalSeats: form.totalSeats,
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
      });
      toast.success("Thêm xe thành công");
      setShowCreateModal(false);
      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (form: EditForm) => {
    if (!selectedBus) return;
    setIsSaving(true);
    try {
      await updateBus(selectedBus.id, {
        busType: form.busType,
        totalSeats: form.totalSeats,
        lastMaintenanceDate: form.lastMaintenanceDate || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
      });
      toast.success("Cập nhật xe thành công");
      setShowEditModal(false);
      setSelectedBus(null);
      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (bus: AdminBus, newStatus: string) => {
    try {
      await updateBusStatus(bus.id, newStatus);
      toast.success(`Đã cập nhật trạng thái xe thành "${STATUS_LABELS[newStatus] ?? newStatus}"`);
      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý xe</h1>
          <p className="mt-1 text-sm text-slate-500">
            Thêm, sửa và theo dõi thông tin đội xe
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0F2849] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a3a6b]"
        >
          <Plus className="h-4 w-4" />
          Thêm xe mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm biển số xe..."
            className="w-64 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
        >
          {BUS_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Biển số</th>
                <th className="px-4 py-3 font-semibold">Loại xe</th>
                <th className="px-4 py-3 font-semibold">Số ghế</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Bảo hiểm</th>
                <th className="px-4 py-3 font-semibold">Bảo trì gần nhất</th>
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
              ) : buses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Không có xe nào
                  </td>
                </tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {bus.licensePlate}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {BUS_TYPE_LABELS[bus.busType] ?? bus.busType}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{bus.totalSeats}</td>
                    <td className="px-4 py-3">
                      <select
                        value={bus.status}
                        onChange={(e) => handleStatusChange(bus, e.target.value)}
                        className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[bus.status] ?? "bg-slate-100 text-slate-600"} cursor-pointer outline-none`}
                      >
                        <option value="AVAILABLE">Sẵn sàng</option>
                        <option value="RUNNING">Đang chạy</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {bus.insuranceExpiry ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-600">
                            {new Date(bus.insuranceExpiry).toLocaleDateString("vi-VN")}
                          </span>
                          {bus.insuranceExpired && (
                            <span className="mt-0.5 inline-flex rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                              Đã hết hạn
                            </span>
                          )}
                          {bus.insuranceExpiringSoon && !bus.insuranceExpired && (
                            <span className="mt-0.5 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                              Sắp hết hạn
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {bus.lastMaintenanceDate
                        ? new Date(bus.lastMaintenanceDate).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          title="Sửa"
                          onClick={() => {
                            setSelectedBus(bus);
                            setShowEditModal(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
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

      {/* Modals */}
      {showCreateModal && (
        <BusModal
          title="Thêm xe mới"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(f) => handleCreate(f as CreateForm)}
          isSaving={isSaving}
        />
      )}
      {showEditModal && selectedBus && (
        <BusModal
          title={`Sửa xe: ${selectedBus.licensePlate}`}
          initialData={selectedBus}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBus(null);
          }}
          onSubmit={(f) => handleEdit(f as EditForm)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// ==================== Bus Modal ====================

interface CreateForm {
  licensePlate: string;
  busType: string;
  totalSeats: number;
  lastMaintenanceDate: string;
  insuranceExpiry: string;
}

interface EditForm {
  busType: string;
  totalSeats: number;
  lastMaintenanceDate: string;
  insuranceExpiry: string;
}

function BusModal({
  title,
  initialData,
  onClose,
  onSubmit,
  isSaving,
}: {
  title: string;
  initialData?: AdminBus;
  onClose: () => void;
  onSubmit: (f: CreateForm | EditForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    licensePlate: initialData?.licensePlate ?? "",
    busType: initialData?.busType ?? "SEAT",
    totalSeats: initialData?.totalSeats ?? 40,
    lastMaintenanceDate: initialData?.lastMaintenanceDate ?? "",
    insuranceExpiry: initialData?.insuranceExpiry ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      const editForm: EditForm = {
        busType: form.busType,
        totalSeats: form.totalSeats,
        lastMaintenanceDate: form.lastMaintenanceDate,
        insuranceExpiry: form.insuranceExpiry,
      };
      onSubmit(editForm);
    } else {
      onSubmit(form);
    }
  };

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
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialData && (
            <FormField label="Biển số xe" required>
              <input
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="VD: 29A-12345"
                required
              />
            </FormField>
          )}
          <FormField label="Loại xe" required>
            <select
              value={form.busType}
              onChange={(e) => setForm({ ...form, busType: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {BUS_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Số ghế" required>
            <input
              type="number"
              value={form.totalSeats}
              onChange={(e) => setForm({ ...form, totalSeats: parseInt(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
              min={1}
            />
          </FormField>
          <FormField label="Ngày bảo trì gần nhất">
            <input
              type="date"
              value={form.lastMaintenanceDate}
              onChange={(e) => setForm({ ...form, lastMaintenanceDate: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </FormField>
          <FormField label="Ngày hết hạn bảo hiểm">
            <input
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
              disabled={isSaving}
              className="rounded-xl bg-[#0F2849] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a6b] disabled:opacity-60"
            >
              {isSaving ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm xe"}
            </button>
          </div>
        </form>
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
