import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Search, Plus, Pencil, X, Route as RouteIcon } from "lucide-react";
import toast from "react-hot-toast";
import {
  getRoutes,
  createRoute,
  updateRoute,
  AdminRoute,
} from "../../api/admin";
import { extractApiErrorMessage } from "../../utils/apiError";

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
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
      <section className="admin-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              Route Management
            </p>
            <h1 className="admin-title text-3xl">Quản lý tuyến đường</h1>
            <p className="admin-subtitle mt-2 text-sm">
              Thêm, sửa và theo dõi các tuyến xe khách đang khai thác.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            Thêm tuyến mới
          </button>
        </div>
      </section>

      <section className="admin-panel flex flex-wrap items-center gap-3 p-4">
        <div className="admin-input flex min-w-[280px] flex-1 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm điểm đi, điểm đến..."
            className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400 focus:shadow-none"
          />
        </div>

        <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(event) => setActiveOnly(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#0F2849] focus:ring-[#0F2849]"
          />
          Chỉ hiển thị tuyến đang hoạt động
        </label>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4">Tuyến đường</th>
                <th className="px-5 py-4">Khoảng cách</th>
                <th className="px-5 py-4">Thời gian dự kiến</th>
                <th className="px-5 py-4">Giá vé cơ bản</th>
                <th className="px-5 py-4">Số chuyến</th>
                <th className="px-5 py-4">Trạng thái</th>
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
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Không có tuyến nào
                  </td>
                </tr>
              ) : (
                routes.map((route) => (
                  <tr key={route.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <RouteIcon className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">{route.origin}</p>
                          <p className="text-xs text-slate-400">→ {route.destination}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {route.distanceKm} km
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDuration(route.estimatedDurationMin)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {formatPrice(route.basePrice)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {route.tripCount ?? 0}
                    </td>

                    <td className="px-5 py-4">
                      {route.isActive ? (
                        <span className="badge badge-success">Hoạt động</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500">
                          Không hoạt động
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          title="Sửa"
                          onClick={() => {
                            setSelectedRoute(route);
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
      </section>

      {showCreateModal && (
        <RouteModal
          title="Thêm tuyến mới"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(form) => handleCreate(form as CreateForm)}
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
          onSubmit={(form) => handleEdit(form as EditForm)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

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
  onSubmit: (form: CreateForm | EditForm) => void;
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
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
          <FormField label="Điểm đi" required>
            <input
              value={form.origin}
              onChange={(event) => setForm({ ...form, origin: event.target.value })}
              className="admin-input w-full px-3 py-2 text-sm outline-none"
              placeholder="VD: Hà Nội"
              required
            />
          </FormField>

          <FormField label="Điểm đến" required>
            <input
              value={form.destination}
              onChange={(event) =>
                setForm({ ...form, destination: event.target.value })
              }
              className="admin-input w-full px-3 py-2 text-sm outline-none"
              placeholder="VD: TP.HCM"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Khoảng cách (km)" required>
              <input
                type="number"
                inputMode="decimal"
                value={form.distanceKm}
                onChange={(event) =>
                  setForm({
                    ...form,
                    distanceKm: Number(event.target.value),
                  })
                }
                className="admin-input w-full px-3 py-2 text-sm outline-none"
                required
                min={0}
                step="any"
                placeholder="VD: 90.5"
              />
            </FormField>

            <FormField label="Thời gian (phút)" required>
              <input
                type="number"
                inputMode="numeric"
                value={form.estimatedDurationMin}
                onChange={(event) =>
                  setForm({
                    ...form,
                    estimatedDurationMin: Number(event.target.value),
                  })
                }
                className="admin-input w-full px-3 py-2 text-sm outline-none"
                required
                min={1}
                step={1}
                placeholder="VD: 120"
              />
            </FormField>
          </div>

          <FormField label="Giá vé cơ bản (VND)" required>
            <input
              type="number"
              inputMode="numeric"
              value={form.basePrice}
              onChange={(event) =>
                setForm({
                  ...form,
                  basePrice: Number(event.target.value),
                })
              }
              className="admin-input w-full px-3 py-2 text-sm outline-none"
              required
              min={0}
              step={1000}
              placeholder="VD: 500000"
            />
          </FormField>

          {initialData && (
            <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-[#0F2849] focus:ring-[#0F2849]"
              />
              Tuyến đang hoạt động
            </label>
          )}

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
  children: ReactNode;
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