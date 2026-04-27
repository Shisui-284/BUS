import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Pencil, X, Route as RouteIcon } from "lucide-react";
import toast from "react-hot-toast";
import {
  getRoutes,
  createRoute,
  updateRoute,
  AdminRoute,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

function formatPrice(v: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<AdminRoute | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadRoutes = useCallback(() => {
    setIsLoading(true);
    getRoutes({
      keyword: keyword || undefined,
      activeOnly: activeOnly || undefined,
    })
      .then(setRoutes)
      .catch(() => toast.error("Không thể tải danh sách tuyến"))
      .finally(() => setIsLoading(false));
  }, [keyword, activeOnly]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const handleCreate = async (form: CreateForm) => {
    setIsSaving(true);
    try {
      await createRoute({
        origin: form.origin,
        destination: form.destination,
        distanceKm: form.distanceKm,
        estimatedDurationMin: form.estimatedDurationMin,
        basePrice: form.basePrice,
      });
      toast.success("Tạo tuyến thành công");
      setShowCreateModal(false);
      loadRoutes();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (form: EditForm) => {
    if (!selectedRoute) return;
    setIsSaving(true);
    try {
      await updateRoute(selectedRoute.id, {
        origin: form.origin,
        destination: form.destination,
        distanceKm: form.distanceKm,
        estimatedDurationMin: form.estimatedDurationMin,
        basePrice: form.basePrice,
        isActive: form.isActive,
      });
      toast.success("Cập nhật tuyến thành công");
      setShowEditModal(false);
      setSelectedRoute(null);
      loadRoutes();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản lý tuyến đường</h1>
          <p className="mt-1 text-sm text-slate-500">
            Thêm, sửa và theo dõi các tuyến xe khách
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0F2849] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a3a6b]"
        >
          <Plus className="h-4 w-4" />
          Thêm tuyến mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm điểm đi, điểm đến..."
            className="w-72 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#0F2849] focus:ring-[#0F2849]"
          />
          Chỉ hiển thị tuyến đang hoạt động
        </label>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tuyến đường</th>
                <th className="px-4 py-3 font-semibold">Khoảng cách</th>
                <th className="px-4 py-3 font-semibold">Thời gian dự kiến</th>
                <th className="px-4 py-3 font-semibold">Giá vé cơ bản</th>
                <th className="px-4 py-3 font-semibold">Số chuyến</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
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
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Không có tuyến nào
                  </td>
                </tr>
              ) : (
                routes.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RouteIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{route.origin}</p>
                          <p className="text-xs text-slate-400">→ {route.destination}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {route.distanceKm} km
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDuration(route.estimatedDurationMin)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatPrice(route.basePrice)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {route.tripCount ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {route.isActive ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          Không hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          title="Sửa"
                          onClick={() => {
                            setSelectedRoute(route);
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
        <RouteModal
          title="Thêm tuyến mới"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(f) => handleCreate(f as CreateForm)}
          isSaving={isSaving}
        />
      )}
      {showEditModal && selectedRoute && (
        <RouteModal
          title={`Sửa tuyến: ${selectedRoute.origin} → ${selectedRoute.destination}`}
          initialData={selectedRoute}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRoute(null);
          }}
          onSubmit={(f) => handleEdit(f as EditForm)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// ==================== Route Modal ====================

interface CreateForm {
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  basePrice: number;
}

interface EditForm extends CreateForm {
  isActive: boolean;
}

function RouteModal({
  title,
  initialData,
  onClose,
  onSubmit,
  isSaving,
}: {
  title: string;
  initialData?: AdminRoute;
  onClose: () => void;
  onSubmit: (f: CreateForm | EditForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditForm>({
    origin: initialData?.origin ?? "",
    destination: initialData?.destination ?? "",
    distanceKm: initialData?.distanceKm ?? 0,
    estimatedDurationMin: initialData?.estimatedDurationMin ?? 0,
    basePrice: initialData?.basePrice ?? 0,
    isActive: initialData?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
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
          <FormField label="Điểm đi" required>
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="VD: Hà Nội"
              required
            />
          </FormField>
          <FormField label="Điểm đến" required>
            <input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="VD: TP.HCM"
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Khoảng cách (km)" required>
              <input
                type="number"
                value={form.distanceKm}
                onChange={(e) => setForm({ ...form, distanceKm: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
                min={0.01}
                step="0.1"
              />
            </FormField>
            <FormField label="Thời gian (phút)" required>
              <input
                type="number"
                value={form.estimatedDurationMin}
                onChange={(e) => setForm({ ...form, estimatedDurationMin: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
                min={1}
              />
            </FormField>
          </div>
          <FormField label="Giá vé cơ bản (VND)" required>
            <input
              type="number"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
              min={1000}
              step="1000"
            />
          </FormField>
          {initialData && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#0F2849] focus:ring-[#0F2849]"
              />
              Tuyến đang hoạt động
            </label>
          )}
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
              {isSaving ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm tuyến"}
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
