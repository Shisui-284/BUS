// ============================================================================
// ADMIN BUSES PAGE — Quản lý xe (Admin)
// Tính năng: CRUD bus, đổi trạng thái (ACTIVE / MAINTENANCE / RETIRED)
// ============================================================================

import { useCallback, useEffect, useState } from "react";
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

import Pagination from "../../components/ui/Pagination";

const BUS_TYPE_OPTIONS = [
  { value: "SLEEPER", label: "Giường nằm (Sleeper)" },
  { value: "SEAT", label: "Ghế ngồi (Seat)" },
  { value: "LIMOUSINE", label: "Limousine" },
];

// Suggest seat count dựa trên loại xe
const BUS_SEAT_SUGGESTIONS: Record<string, number> = {
  LIMOUSINE: 40,
  SLEEPER: 30,
  SEAT: 40,
};

const BUS_STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "AVAILABLE", label: "Sẵn sàng" },
  { value: "RUNNING", label: "Đang chạy" },
  { value: "MAINTENANCE", label: "Bảo trì" },
];

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  RUNNING: "Đang chạy",
  MAINTENANCE: "Bảo trì",
};

const STATUS_BADGES: Record<string, string> = {
  AVAILABLE: "badge-success",
  RUNNING: "badge-info",
  MAINTENANCE: "badge-warning",
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

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadBuses = useCallback(() => {
    setIsLoading(true);

    getBuses({
      keyword: keyword || undefined,
      status: filterStatus || undefined,
    })
      .then((data) => {
        setBuses(data);
        setCurrentPage(1);
      })
      .catch(() => toast.error("Không thể tải danh sách xe"))
      .finally(() => setIsLoading(false));
  }, [keyword, filterStatus]);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const totalPages = Math.ceil(buses.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedBuses = buses.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

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

      toast.success(
        `Đã cập nhật trạng thái xe thành "${STATUS_LABELS[newStatus] ?? newStatus}"`
      );

      loadBuses();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              Fleet Management
            </p>
            <h1 className="admin-title text-3xl">Quản lý xe</h1>
            <p className="admin-subtitle mt-2 text-sm">
              Thêm, sửa và theo dõi thông tin phương tiện trong đội xe.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            Thêm xe mới
          </button>
        </div>
      </section>

      <section className="admin-panel flex flex-wrap items-center gap-3 p-4">
        <div className="admin-input flex min-w-[260px] flex-1 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm biển số xe..."
            className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400 focus:shadow-none"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="admin-select px-3 py-2 text-sm outline-none"
        >
          {BUS_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4">Biển số</th>
                <th className="px-5 py-4">Loại xe</th>
                <th className="px-5 py-4">Số ghế</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Bảo hiểm</th>
                <th className="px-5 py-4">Bảo trì gần nhất</th>
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
              ) : paginatedBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Không có xe nào
                  </td>
                </tr>
              ) : (
                paginatedBuses.map((bus) => (
                  <tr key={bus.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-700">
                          BUS
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {bus.licensePlate}
                          </p>
                          <p className="text-xs text-slate-400">
                            ID #{bus.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {BUS_TYPE_LABELS[bus.busType] ?? bus.busType}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {bus.totalSeats}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={bus.status}
                        onChange={(event) => handleStatusChange(bus, event.target.value)}
                        className={`badge cursor-pointer border-0 outline-none ${
                          STATUS_BADGES[bus.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <option value="AVAILABLE">Sẵn sàng</option>
                        <option value="RUNNING">Đang chạy</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      {bus.insuranceExpiry ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-medium text-slate-600">
                            {new Date(bus.insuranceExpiry).toLocaleDateString("vi-VN")}
                          </span>

                          {bus.insuranceExpired && (
                            <span className="badge badge-danger">
                              Đã hết hạn
                            </span>
                          )}

                          {bus.insuranceExpiringSoon && !bus.insuranceExpired && (
                            <span className="badge badge-warning">
                              Sắp hết hạn
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {bus.lastMaintenanceDate
                        ? new Date(bus.lastMaintenanceDate).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          title="Sửa"
                          onClick={() => {
                            setSelectedBus(bus);
                            setShowEditModal(true);
                          }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
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
        
        {totalPages > 1 && (
          <div className="border-t border-slate-100 bg-slate-50/50">
            <Pagination 
              currentPage={validCurrentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </section>

      {showCreateModal && (
        <BusModal
          title="Thêm xe mới"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(form) => handleCreate(form as CreateForm)}
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
          onSubmit={(form) => handleEdit(form as EditForm)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

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
  onSubmit: (form: CreateForm | EditForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    licensePlate: initialData?.licensePlate ?? "",
    busType: initialData?.busType ?? "LIMOUSINE",
    totalSeats: initialData?.totalSeats ?? BUS_SEAT_SUGGESTIONS["LIMOUSINE"],
    lastMaintenanceDate: initialData?.lastMaintenanceDate ?? "",
    insuranceExpiry: initialData?.insuranceExpiry ?? "",
  });

  // Auto-update seat count when bus type changes
  const handleBusTypeChange = (newBusType: string) => {
    const suggestedSeats = BUS_SEAT_SUGGESTIONS[newBusType] ?? 40;
    setForm((prev: CreateForm) => ({
      ...prev,
      busType: newBusType,
      // Only auto-fill seats if user hasn't manually changed from default
      totalSeats: prev.totalSeats === BUS_SEAT_SUGGESTIONS[prev.busType] ? suggestedSeats : prev.totalSeats,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialData && (
            <FormField label="Biển số xe" required>
              <input
                value={form.licensePlate}
                onChange={(event) =>
                  setForm({ ...form, licensePlate: event.target.value })
                }
                className="admin-input w-full px-3 py-2 text-sm outline-none"
                placeholder="VD: 29A-12345"
                required
              />
            </FormField>
          )}

          <FormField label="Loại xe" required>
            <select
              value={form.busType}
              onChange={(event) => handleBusTypeChange(event.target.value)}
              className="admin-select w-full px-3 py-2 text-sm outline-none"
            >
              {BUS_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={`Số ghế (đề xuất: ${BUS_SEAT_SUGGESTIONS[form.busType] ?? 40} ghế)`} required>
            <input
              type="number"
              inputMode="numeric"
              value={form.totalSeats}
              onChange={(event) =>
                setForm({
                  ...form,
                  totalSeats: Number(event.target.value),
                })
              }
              className="admin-input w-full px-3 py-2 text-sm outline-none"
              required
              min={1}
              step={1}
            />
          </FormField>

          <FormField label="Ngày bảo trì gần nhất">
            <input
              type="date"
              value={form.lastMaintenanceDate}
              onChange={(event) =>
                setForm({ ...form, lastMaintenanceDate: event.target.value })
              }
              className="admin-input w-full px-3 py-2 text-sm outline-none"
            />
          </FormField>

          <FormField label="Ngày hết hạn bảo hiểm">
            <input
              type="date"
              value={form.insuranceExpiry}
              onChange={(event) =>
                setForm({ ...form, insuranceExpiry: event.target.value })
              }
              className="admin-input w-full px-3 py-2 text-sm outline-none"
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
              disabled={isSaving}
              className="admin-button-primary px-4 py-2 text-sm"
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
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}