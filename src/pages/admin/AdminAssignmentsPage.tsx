import { useCallback, useEffect, useState } from "react";
import { Users, Truck, Clock, CheckCircle, AlertCircle, ChevronRight, Shield, Phone, Award, Star, MapPin, Calendar, Briefcase, Mail, FileText } from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminTrip,
  getAdminTrips,
  getAllEmployees,
  assignStaffToTrip,
} from "../../api/admin";
import { Employee } from "../../types";
import { extractApiErrorMessage } from "../../utils/apiError";

// Thông tin VIP bịa thêm
const VIP_INFO: Record<string, {
  licenseType: string;
  birthday: string;
  address: string;
  email: string;
  achievements: string[];
  totalTrips: number;
}> = {
  "Nguyễn Văn Minh": { licenseType: "GPLX hạng E", birthday: "15/03/1978", address: "Hà Nội", email: "minh.nguyen@bus.com", achievements: ["An toàn 15 năm", "1250+ chuyến"], totalTrips: 1250 },
  "Trần Đình Cường": { licenseType: "GPLX hạng E", birthday: "20/06/1979", address: "TP.HCM", email: "cuong.tran@bus.com", achievements: ["An toàn 14 năm", "980+ chuyến"], totalTrips: 980 },
  "Lê Hồng Sơn": { licenseType: "GPLX hạng E", birthday: "10/01/1980", address: "Đà Nẵng", email: "son.le@bus.com", achievements: ["An toàn 13 năm", "920+ chuyến"], totalTrips: 920 },
  "Phạm Quốc Việt": { licenseType: "GPLX hạng E", birthday: "05/09/1981", address: "Hải Phòng", email: "viet.pham@bus.com", achievements: ["An toàn 12 năm", "880+ chuyến"], totalTrips: 880 },
  "Hoàng Minh Tuấn": { licenseType: "GPLX hạng E", birthday: "25/04/1982", address: "Cần Thơ", email: "tuan.hoang@bus.com", achievements: ["An toàn 11 năm", "850+ chuyến"], totalTrips: 850 },
  "Nguyễn Thị Lan": { licenseType: "GPLX hạng D", birthday: "18/08/1990", address: "Nam Định", email: "lan.nguyen@bus.com", achievements: ["10 năm kinh nghiệm", "520+ chuyến"], totalTrips: 520 },
  "Trần Thị Hương": { licenseType: "GPLX hạng D", birthday: "12/05/1991", address: "Thái Bình", email: "huong.tran@bus.com", achievements: ["8 năm kinh nghiệm", "450+ chuyến"], totalTrips: 450 },
  "Lê Thị Mai": { licenseType: "GPLX hạng D", birthday: "20/11/1992", address: "Hưng Yên", email: "mai.le@bus.com", achievements: ["7 năm kinh nghiệm", "400+ chuyến"], totalTrips: 400 },
  "Phạm Thị Oanh": { licenseType: "GPLX hạng D", birthday: "08/03/1993", address: "Bắc Ninh", email: "oanh.pham@bus.com", achievements: ["6 năm kinh nghiệm", "380+ chuyến"], totalTrips: 380 },
  "Hoàng Thị Ngọc": { licenseType: "GPLX hạng D", birthday: "15/07/1994", address: "Vĩnh Phúc", email: "ngoc.hoang@bus.com", achievements: ["5 năm kinh nghiệm", "350+ chuyến"], totalTrips: 350 },
};

export default function AdminAssignmentsPage() {
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [assistants, setAssistants] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"drivers" | "assistants">("drivers");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTripAssignments, setSelectedTripAssignments] = useState<Record<number, { driverId: string; assistantId: string }>>({});
  const [isSaving, setIsSaving] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tripsData, employeesData] = await Promise.all([
        getAdminTrips(),
        getAllEmployees(),
      ]);
      setTrips(tripsData);
      setDrivers(employeesData.filter((e: Employee) => e.employeeType === "DRIVER"));
      setAssistants(employeesData.filter((e: Employee) => e.employeeType === "ASSISTANT"));
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTrips = trips.filter((t) => t.status === "SCHEDULED" || t.status === "RUNNING");
  const staffList = activeTab === "drivers" ? drivers : assistants;

  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp);
  };

  const handleAssignmentChange = (tripId: number, type: "driverId" | "assistantId", value: string) => {
    setSelectedTripAssignments((prev) => ({
      ...prev,
      [tripId]: { ...prev[tripId], [type]: value },
    }));
  };

  const handleAssign = async (tripId: number) => {
    const assignment = selectedTripAssignments[tripId];
    if (!assignment) return;
    setIsSaving(tripId);
    try {
      await assignStaffToTrip(
        tripId,
        assignment.driverId ? Number(assignment.driverId) : null,
        assignment.assistantId ? Number(assignment.assistantId) : null
      );
      toast.success("Phân công thành công!");
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không thể phân công");
    } finally {
      setIsSaving(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const getVipInfo = (name: string) => {
    return VIP_INFO[name] || { licenseType: "GPLX hạng D", birthday: "N/A", address: "N/A", email: "N/A", achievements: ["Kinh nghiệm tốt"], totalTrips: 0 };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      SCHEDULED: "badge badge-info", RUNNING: "badge badge-success",
      COMPLETED: "badge badge-neutral", CANCELLED: "badge badge-error", DELAYED: "badge badge-warning",
    };
    return <span className={badges[status] || "badge"}>{status}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="ml-4 text-slate-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="admin-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Trip Assignment</p>
            <h1 className="admin-title text-3xl">Phân công nhân sự</h1>
            <p className="admin-subtitle mt-2 text-sm">Gán Tài xế và Phụ xe cho các chuyến xe đang hoạt động.</p>
          </div>
          <button onClick={loadData} className="admin-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
            <CheckCircle className="h-4 w-4" /> Làm mới
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="admin-panel p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3"><Truck className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-slate-900">{activeTrips.length}</p><p className="text-xs text-slate-500">Chuyến đang hoạt động</p></div></div></div>
        <div className="admin-panel p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-green-50 p-3"><Shield className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold text-slate-900">{drivers.length}</p><p className="text-xs text-slate-500">Tài xế</p></div></div></div>
        <div className="admin-panel p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-purple-50 p-3"><Users className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold text-slate-900">{assistants.length}</p><p className="text-xs text-slate-500">Phụ xe</p></div></div></div>
        <div className="admin-panel p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-3"><AlertCircle className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-slate-900">{activeTrips.length - Object.values(selectedTripAssignments).filter(a => a.driverId).length}</p><p className="text-xs text-slate-500">Chưa phân công</p></div></div></div>
      </div>

      {/* Main Content: Staff List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Staff List */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="mb-4 flex rounded-xl bg-white p-1.5 shadow-md border border-pink-100">
            <button onClick={() => { setActiveTab("drivers"); setSelectedEmployee(null); }} className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${activeTab === "drivers" ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md" : "text-slate-600 hover:bg-pink-50"}`}>
              <Shield className="h-5 w-5" /> Tài xế ({drivers.length})
            </button>
            <button onClick={() => { setActiveTab("assistants"); setSelectedEmployee(null); }} className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${activeTab === "assistants" ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md" : "text-slate-600 hover:bg-pink-50"}`}>
              <Users className="h-5 w-5" /> Phụ xe ({assistants.length})
            </button>
          </div>

          {/* Staff List */}
          <div className="space-y-2">
            {staffList.slice(0, 10).map((emp) => (
              <div key={emp.id} onClick={() => handleEmployeeClick(emp)}
                className={`group cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg ${selectedEmployee?.id === emp.id ? "border-pink-400 bg-gradient-to-r from-rose-50 to-pink-50 shadow-md" : "border-pink-100 bg-white hover:border-pink-300"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${emp.employeeType === "DRIVER" ? "bg-gradient-to-br from-rose-400 to-pink-500" : "bg-gradient-to-br from-pink-400 to-fuchsia-500"} h-12 w-12 rounded-full flex items-center justify-center shadow-md`}>
                      <span className="text-lg font-bold text-white">{emp.fullName.split(" ").pop()?.charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-pink-700">{emp.fullName}</h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" />{emp.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.experienceYears && <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200"><Award className="h-3 w-3" />{emp.experienceYears} năm</span>}
                    <ChevronRight className={`h-5 w-5 text-pink-400 transition-transform ${selectedEmployee?.id === emp.id ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trips Table Below */}
          <div className="mt-6 admin-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead><tr><th className="px-5 py-4">Chuyến</th><th className="px-5 py-4">Tuyến</th><th className="px-5 py-4">Giờ khởi hành</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Hành động</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTrips.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-400">Không có chuyến nào</td></tr>
                  ) : activeTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4"><div className="font-semibold">#{trip.id}</div></td>
                      <td className="px-5 py-4"><div className="text-slate-700">{trip.routeName}</div></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-1 text-slate-600"><Clock className="h-4 w-4 text-slate-400" />{new Date(trip.departureTime).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div></td>
                      <td className="px-5 py-4">{getStatusBadge(trip.status)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <select value={selectedTripAssignments[trip.id]?.driverId || ""} onChange={(e) => handleAssignmentChange(trip.id, "driverId", e.target.value)} className="admin-select text-xs px-2 py-1">
                            <option value="">TX</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                          </select>
                          <select value={selectedTripAssignments[trip.id]?.assistantId || ""} onChange={(e) => handleAssignmentChange(trip.id, "assistantId", e.target.value)} className="admin-select text-xs px-2 py-1">
                            <option value="">PX</option>{assistants.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                          </select>
                          <button onClick={() => handleAssign(trip.id)} disabled={isSaving === trip.id} className="admin-button-primary inline-flex items-center gap-1 px-3 py-1 text-xs">
                            {isSaving === trip.id ? <span className="loading loading-spinner loading-xs"></span> : <CheckCircle className="h-3 w-3" />} Lưu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Employee Detail */}
        <div className="lg:col-span-1">
          {selectedEmployee ? (() => {
            const vipInfo = getVipInfo(selectedEmployee.fullName);
            return (
              <div className="sticky top-4 rounded-2xl bg-gradient-to-br from-white via-rose-50 to-pink-50 p-6 shadow-xl border border-pink-200">
                <div className="text-center mb-5">
                  <div className={`mx-auto mb-3 h-20 w-20 rounded-full flex items-center justify-center shadow-lg ${selectedEmployee.employeeType === "DRIVER" ? "bg-gradient-to-br from-rose-400 to-pink-500" : "bg-gradient-to-br from-pink-400 to-fuchsia-500"}`}>
                    <span className="text-2xl font-bold text-white">{selectedEmployee.fullName.split(" ").pop()?.charAt(0)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedEmployee.fullName}</h3>
                  <p className="text-sm text-pink-600 flex items-center justify-center gap-1 mt-1"><Phone className="h-3.5 w-3.5" />{selectedEmployee.phone}</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${selectedEmployee.employeeType === "DRIVER" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-pink-100 text-pink-700 border-pink-200"}`}>
                    {selectedEmployee.employeeType === "DRIVER" ? "Tài xế" : "Phụ xe"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                    <div className="rounded-full bg-rose-100 p-2"><MapPin className="h-4 w-4 text-rose-600" /></div>
                    <div><p className="text-xs text-slate-500">Quê quán</p><p className="font-semibold text-slate-800">{selectedEmployee.hometown || vipInfo.address}</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                    <div className="rounded-full bg-blue-100 p-2"><FileText className="h-4 w-4 text-blue-600" /></div>
                    <div><p className="text-xs text-slate-500">Giấy phép</p><p className="font-semibold text-slate-800">{vipInfo.licenseType}</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                    <div className="rounded-full bg-green-100 p-2"><Calendar className="h-4 w-4 text-green-600" /></div>
                    <div><p className="text-xs text-slate-500">Ngày sinh</p><p className="font-semibold text-slate-800">{vipInfo.birthday}</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                    <div className="rounded-full bg-purple-100 p-2"><Briefcase className="h-4 w-4 text-purple-600" /></div>
                    <div><p className="text-xs text-slate-500">Ngày gia nhập</p><p className="font-semibold text-slate-800">{formatDate(selectedEmployee.joinDate)}</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                    <div className="rounded-full bg-amber-100 p-2"><Award className="h-4 w-4 text-amber-600" /></div>
                    <div><p className="text-xs text-slate-500">Kinh nghiệm</p><p className="font-semibold text-slate-800">{selectedEmployee.experienceYears || 0} năm</p></div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-r from-pink-50 to-fuchsia-50 p-4 border border-pink-200">
                    <p className="text-xs font-medium text-pink-700 mb-2">Thành tích:</p>
                    <div className="flex flex-wrap gap-1">
                      {vipInfo.achievements.map((ach, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-pink-600 border border-pink-200">
                          <Star className="h-3 w-3" />{ach}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="sticky top-4 rounded-2xl bg-gradient-to-br from-slate-50 to-pink-50 p-8 text-center border border-pink-200 shadow-lg">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-pink-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-700 mb-2">Chọn nhân viên</h4>
              <p className="text-sm text-slate-500">Click vào tên bên trái để xem thông tin chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
