import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useDispatcherStore } from "../../stores/dispatcherStore";
import StatusBadge from "../../components/ui/StatusBadge";
import { extractApiErrorMessage, extractApiStatus } from "../../utils/apiError";

export default function DispatcherDashboardPage() {
  const trips = useDispatcherStore((state) => state.trips);
  const employees = useDispatcherStore((state) => state.employees);
  const loadTrips = useDispatcherStore((state) => state.loadTrips);
  const loadAvailableEmployees = useDispatcherStore(
    (state) => state.loadAvailableEmployees,
  );
  const getTripAssignments = useDispatcherStore(
    (state) => state.getTripAssignments,
  );
  const isEmployeeAvailable = useDispatcherStore(
    (state) => state.isEmployeeAvailable,
  );
  const assignTrip = useDispatcherStore((state) => state.assignTrip);
  const isLoading = useDispatcherStore((state) => state.isLoading);
  const isAssigning = useDispatcherStore((state) => state.isAssigning);

  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [role, setRole] = useState<"DRIVER" | "ASSISTANT">("DRIVER");

  useEffect(() => {
    loadTrips().catch(() => {
      toast.error("Không thể tải danh sách chuyến từ hệ thống.");
    });
  }, [loadTrips]);

  useEffect(() => {
    if (trips.length > 0 && selectedTrip === null) {
      setSelectedTrip(trips[0].id);
    }
  }, [trips, selectedTrip]);

  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTrip) ?? null,
    [selectedTrip, trips],
  );

  useEffect(() => {
    if (!currentTrip) {
      return;
    }

    loadAvailableEmployees(
      currentTrip.departureTime,
      currentTrip.arrivalTime,
      role,
    )
      .then(() => {
        setEmployeeId((prev) => {
          if (prev && isEmployeeAvailable(prev)) {
            return prev;
          }
          return useDispatcherStore.getState().employees[0]?.id ?? null;
        });
      })
      .catch(() => {
        toast.error("Không thể tải danh sách nhân sự khả dụng.");
      });
  }, [currentTrip, role, loadAvailableEmployees, isEmployeeAvailable]);

  const tripAssignments = currentTrip ? getTripAssignments(currentTrip.id) : [];
  const employeeAvailable = currentTrip
    ? employeeId !== null && isEmployeeAvailable(employeeId)
    : true;

  const roleOptions = employees.filter(
    (employee) => employee.employeeType === role,
  );

  const handleAssign = async () => {
    if (!currentTrip) {
      toast.error("Vui lòng chọn chuyến trước khi phân công.");
      return;
    }
    if (!employeeId) {
      toast.error("Vui lòng chọn nhân sự.");
      return;
    }
    if (!employeeAvailable) {
      toast.error(
        "Nhân sự này đang có chuyến xung đột thời gian. Chọn người khác hoặc chuyến khác.",
      );
      return;
    }

    try {
      await assignTrip(currentTrip.id, employeeId, role);
      toast.success("Đã phân công nhân sự cho chuyến.");
      await loadAvailableEmployees(
        currentTrip.departureTime,
        currentTrip.arrivalTime,
        role,
      );
    } catch (error: unknown) {
      const status = extractApiStatus(error);
      const message = extractApiErrorMessage(error);
      if (status === 409) {
        toast.error("Xung đột lịch: nhân sự đã được phân công ở chuyến khác.");
        return;
      }
      toast.error(message || "Không thể phân công. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Dashboard Điều phối
            </h1>
            <p className="mt-2 text-slate-600">
              Quản lý danh sách chuyến, theo dõi trạng thái và phân công tài
              xế/phụ xe.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Tổng chuyến</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {isLoading ? "..." : trips.length}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Đã lên lịch</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {trips.filter((trip) => trip.status === "SCHEDULED").length}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Trễ chuyến</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {trips.filter((trip) => trip.status === "DELAYED").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách chuyến
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Chuyến</th>
                <th className="px-4 py-3 font-semibold">Tuyến</th>
                <th className="px-4 py-3 font-semibold">Xe</th>
                <th className="px-4 py-3 font-semibold">Khởi hành</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {trips.map((trip) => {
                return (
                  <tr
                    key={trip.id}
                    className={`cursor-pointer ${selectedTrip === trip.id ? "bg-slate-100" : ""}`}
                    onClick={() => setSelectedTrip(trip.id)}
                  >
                    <td className="px-4 py-3">{trip.id}</td>
                    <td className="px-4 py-3">{trip.routeName || "-"}</td>
                    <td className="px-4 py-3">{trip.busLabel || "-"}</td>
                    <td className="px-4 py-3">
                      {format(new Date(trip.departureTime), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={trip.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Chi tiết chuyến
          </h2>
          {!currentTrip ? (
            <p className="mt-4 text-slate-500">Chọn chuyến để xem chi tiết.</p>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Tuyến
                  </p>
                  <p className="mt-2 text-sm text-slate-900">
                    {currentTrip.routeName}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Xe
                  </p>
                  <p className="mt-2 text-sm text-slate-900">
                    {currentTrip.busLabel}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Khởi hành
                  </p>
                  <p className="mt-2 text-sm text-slate-900">
                    {format(
                      new Date(currentTrip.departureTime),
                      "dd/MM/yyyy HH:mm",
                    )}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Dự kiến đến
                  </p>
                  <p className="mt-2 text-sm text-slate-900">
                    {format(
                      new Date(currentTrip.arrivalTime),
                      "dd/MM/yyyy HH:mm",
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={currentTrip.status} />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Phân công hiện tại
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {tripAssignments.length === 0 ? (
                    <p>Chưa có nhân sự phân công cho chuyến này.</p>
                  ) : (
                    tripAssignments.map((assignment) => {
                      return (
                        <p key={assignment.id}>
                          <span className="font-semibold">
                            {assignment.role === "DRIVER" ? "Tài xế" : "Phụ xe"}
                            :
                          </span>{" "}
                          {assignment.employeeName ?? "Chưa gán"}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Phân công nhân sự
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Chọn vai trò
              </label>
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "DRIVER" | "ASSISTANT")
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              >
                <option value="DRIVER">Tài xế</option>
                <option value="ASSISTANT">Phụ xe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Chọn nhân sự
              </label>
              <select
                value={employeeId ?? ""}
                onChange={(event) => setEmployeeId(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              >
                {roleOptions.length === 0 && (
                  <option value="">Không có nhân sự phù hợp</option>
                )}
                {roleOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
            {currentTrip && !employeeAvailable && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Nhân sự này đang có chuyến trùng giờ với chuyến đã chọn.
              </div>
            )}
            <button
              type="button"
              className="w-full rounded-2xl bg-[#0F2849] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:bg-slate-300"
              onClick={handleAssign}
              disabled={!currentTrip || !employeeAvailable || isAssigning}
            >
              {isAssigning ? "Đang phân công..." : "Phân công"}
            </button>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Ghi chú</p>
              <p className="mt-2">
                Chọn nhân sự phù hợp cho vai trò và tránh xung đột lịch theo giờ
                khởi hành.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
