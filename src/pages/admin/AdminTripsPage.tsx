import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminBus,
  AdminRoute,
  AdminTrip,
  createAdminTrip,
  deleteAdminTrip,
  getAdminTrips,
  getBuses,
  getRoutes,
  updateAdminTrip,
} from "../../api/admin";
import { TripStatus } from "../../types";
import { extractApiErrorMessage } from "../../utils/apiError";

const TRIP_STATUS_OPTIONS: { value: TripStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "RUNNING", label: "Đang chạy" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "DELAYED", label: "Trễ" },
];

const STATUS_LABELS: Record<TripStatus, string> = {
  SCHEDULED: "Đã lên lịch",
  RUNNING: "Đang chạy",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  DELAYED: "Trễ",
};

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [buses, setBuses] = useState<AdminBus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterRouteId, setFilterRouteId] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<TripStatus | "">("");
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<null | any>(null);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminTrips({
        routeId: filterRouteId || undefined,
        status: filterStatus || undefined,
      });
      setTrips(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể tải danh sách chuyến");
    } finally {
      setIsLoading(false);
    }
  }, [filterRouteId, filterStatus]);

  const loadRoutesAndBuses = useCallback(async () => {
    try {
      const [routeData, busData] = await Promise.all([
        getRoutes({ activeOnly: true }),
        getBuses(),
      ]);
      setRoutes(routeData);
      setBuses(busData);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể tải dữ liệu tuyến/xe");
    }
  }, []);

  useEffect(() => {
    loadRoutesAndBuses();
  }, [loadRoutesAndBuses]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleSaveTrip = async (form: TripFormValues) => {
    setIsSaving(true);
    try {
      if (editingTrip) {
        await updateAdminTrip(editingTrip.id, {
          routeId: form.routeId,
          busId: form.busId,
          departureTime: form.departureTime,
          arrivalTime: form.arrivalTime,
          status: form.status,
        });
        toast.success("Cập nhật chuyến thành công");
      } else {
        await createAdminTrip({
          routeId: form.routeId,
          busId: form.busId,
          departureTime: form.departureTime,
          arrivalTime: form.arrivalTime,
          status: form.status,
        });
        toast.success("Tạo chuyến mới thành công");
      }
      setShowModal(false);
      setEditingTrip(null);
      await loadTrips();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể lưu chuyến");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrip = async (tripId: number) => {
    if (!window.confirm("Bạn có chắc muốn xoá chuyến này?")) {
      return;
    }

    try {
      await deleteAdminTrip(tripId);
      toast.success("Đã xoá chuyến");
      await loadTrips();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể xoá chuyến");
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              Trip Management
            </p>
            <h1 className="admin-title text-3xl">Quản lý chuyến</h1>
            <p className="admin-subtitle mt-2 text-sm">
              Lên lịch, cập nhật và quản lý các chuyến xe trên hệ thống.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingTrip(null);
              setShowModal(true);
            }}
            className="admin-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            Tạo chuyến mới
          </button>
        </div>
      </section>

      <section className="admin-panel flex flex-wrap items-center gap-3 p-4">
        <select
          value={filterRouteId}
          onChange={(event) => setFilterRouteId(Number(event.target.value) || "")}
          className="admin-select px-3 py-2 text-sm outline-none"
        >
          <option value="">Tất cả tuyến</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.origin} → {route.destination}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value as TripStatus | "")}
          className="admin-select px-3 py-2 text-sm outline-none"
        >
          {TRIP_STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          onClick={loadTrips}
          className="admin-button-secondary px-4 py-2 text-sm"
        >
          Làm mới
        </button>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Tuyến</th>
                <th className="px-5 py-4">Xe</th>
                <th className="px-5 py-4">Khởi hành</th>
                <th className="px-5 py-4">Đến</th>
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
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Không tìm thấy chuyến nào.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-5 py-4 font-semibold text-slate-900">#{trip.id}</td>
                    <td className="px-5 py-4 text-slate-600">{trip.routeName}</td>
                    <td className="px-5 py-4 text-slate-600">{trip.busLabel}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(trip.departureTime).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(trip.arrivalTime).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="badge badge-info">{STATUS_LABELS[trip.status]}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          title="Sửa"
                          onClick={() => {
                            setEditingTrip(trip);
                            setShowModal(true);
                          }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Xoá"
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
      </section>

      {showModal && (
        <TripModal
          onClose={() => {
            setShowModal(false);
            setEditingTrip(null);
          }}
          onSubmit={handleSaveTrip}
          isSaving={isSaving}
          routes={routes}
          buses={buses}
          initialData={editingTrip}
        />
      )}
    </div>
  );
}

interface TripFormValues {
  routeId: number;
  busId: number;
  departureTime: string;
  arrivalTime: string;
  status?: string;
}

function TripModal({
  onClose,
  onSubmit,
  isSaving,
  routes,
  buses,
  initialData,
}: {
  onClose: () => void;
  onSubmit: (form: TripFormValues) => void;
  isSaving: boolean;
  routes: AdminRoute[];
  buses: AdminBus[];
  initialData: any;
}) {
  const [form, setForm] = useState<TripFormValues>({
    routeId: initialData?.routeId ?? routes[0]?.id ?? 0,
    busId: initialData?.busId ?? buses[0]?.id ?? 0,
    departureTime: initialData?.departureTime ?? "",
    arrivalTime: initialData?.arrivalTime ?? "",
    status: initialData?.status ?? "SCHEDULED",
  });

  useEffect(() => {
    setForm({
      routeId: initialData?.routeId ?? routes[0]?.id ?? 0,
      busId: initialData?.busId ?? buses[0]?.id ?? 0,
      departureTime: initialData?.departureTime ?? "",
      arrivalTime: initialData?.arrivalTime ?? "",
      status: initialData?.status ?? "SCHEDULED",
    });
  }, [initialData, routes, buses]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  const hasRouteData = routes.length > 0 && buses.length > 0;

  return (
    <div className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="admin-modal w-full max-w-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? `Chỉnh sửa chuyến #${initialData.id}` : "Tạo chuyến mới"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tuyến
                <span className="text-red-500">*</span>
              </label>
              <select
                value={form.routeId}
                disabled={!routes.length}
                onChange={(event) => setForm({ ...form, routeId: Number(event.target.value) })}
                className="admin-select w-full px-3 py-2 text-sm outline-none"
              >
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.origin} → {route.destination}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Xe
                <span className="text-red-500">*</span>
              </label>
              <select
                value={form.busId}
                disabled={!buses.length}
                onChange={(event) => setForm({ ...form, busId: Number(event.target.value) })}
                className="admin-select w-full px-3 py-2 text-sm outline-none"
              >
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.licensePlate} — {bus.busType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Ngày giờ khởi hành
                <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.departureTime}
                onChange={(event) => setForm({ ...form, departureTime: event.target.value })}
                className="admin-input w-full px-3 py-2 text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Ngày giờ đến
                <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.arrivalTime}
                onChange={(event) => setForm({ ...form, arrivalTime: event.target.value })}
                className="admin-input w-full px-3 py-2 text-sm outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Trạng thái
            </label>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="admin-select w-full px-3 py-2 text-sm outline-none"
            >
              {TRIP_STATUS_OPTIONS.filter((item) => item.value !== "").map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {!hasRouteData && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Vui lòng đảm bảo hệ thống có ít nhất một tuyến và một xe đang sẵn sàng.
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="admin-button-secondary px-4 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || !hasRouteData}
              className="admin-button-primary px-4 py-2 text-sm"
            >
              {isSaving ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Tạo chuyến"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
