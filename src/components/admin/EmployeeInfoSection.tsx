import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  User,
  MapPin,
  Phone,
  Calendar,
  Award,
  Star,
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Briefcase,
  Mail,
  FileText
} from "lucide-react";
import { getAllEmployees, getTopExperiencedDrivers } from "../../api/admin";

interface EmployeeInfo {
  id: number;
  fullName: string;
  phone: string;
  hometown?: string;
  experienceYears?: number;
  joinDate?: string;
  employeeType: string;
  status: string;
}

interface TopDriver extends EmployeeInfo {
  experienceYears: number;
}

// Thông tin VIP bịa thêm cho từng người
const VIP_INFO: Record<string, {
  licenseType: string;
  birthday: string;
  address: string;
  email: string;
  achievements: string[];
  totalTrips: number;
  rating: number;
}> = {
  // Tài xế VIP
  "Nguyễn Văn Minh": {
    licenseType: "GPLX hạng E",
    birthday: "15/03/1978",
    address: "Số 15, Ngõ 45, Đường Láng Hạ, Đống Đa, Hà Nội",
    email: "minh.nguyen@busvip.com",
    achievements: ["An toàn 15 năm", "1000+ chuyến xe", "Không tai nạn", "Tài xế xuất sắc 2023"],
    totalTrips: 1250,
    rating: 4.9
  },
  "Trần Đình Cường": {
    licenseType: "GPLX hạng E",
    birthday: "20/06/1979",
    address: "123 Đường Nguyễn Trãi, Quận 1, TP.HCM",
    email: "cuong.tran@busvip.com",
    achievements: ["An toàn 14 năm", "980+ chuyến xe", "Chuyên tuyến Bắc Nam", "Kinh nghiệm đường trường"],
    totalTrips: 980,
    rating: 4.8
  },
  "Lê Hồng Sơn": {
    licenseType: "GPLX hạng E",
    birthday: "10/01/1980",
    address: "45 Đường Trần Phú, TP Đà Nẵng",
    email: "son.le@busvip.com",
    achievements: ["An toàn 13 năm", "920+ chuyến xe", "Thành thạo địa hình miền Trung", "Phản xạ nhanh"],
    totalTrips: 920,
    rating: 4.9
  },
  "Phạm Quốc Việt": {
    licenseType: "GPLX hạng E",
    birthday: "05/09/1981",
    address: "78 Đường Minh Khai, TP Hải Phòng",
    email: "viet.pham@busvip.com",
    achievements: ["An toàn 12 năm", "880+ chuyến xe", "Chuyên tuyến ven biển", "Tin cậy tuyệt đối"],
    totalTrips: 880,
    rating: 4.7
  },
  "Hoàng Minh Tuấn": {
    licenseType: "GPLX hạng E",
    birthday: "25/04/1982",
    address: "156 Đường 30 Tháng 4, TP Cần Thơ",
    email: "tuan.hoang@busvip.com",
    achievements: ["An toàn 11 năm", "850+ chuyến xe", "Chuyên miền Tây", "Nhiệt tình với khách"],
    totalTrips: 850,
    rating: 4.8
  },
  // Phụ xe VIP
  "Lý Thị Hương": {
    licenseType: "GPLX hạng D",
    birthday: "18/08/1990",
    address: "Số 22, Đường Nguyễn Du, Nam Định",
    email: "huong.ly@busvip.com",
    achievements: ["10 năm kinh nghiệm", "Chăm sóc khách hàng xuất sắc", "500+ chuyến xe"],
    totalTrips: 520,
    rating: 4.9
  },
  "Trương Thị Lan": {
    licenseType: "GPLX hạng D",
    birthday: "12/05/1992",
    address: "Số 35, Đường Trần Hưng Đạo, Thái Bình",
    email: "lan.truong@busvip.com",
    achievements: ["8 năm kinh nghiệm", "Thân thiện với khách", "450+ chuyến xe"],
    totalTrips: 450,
    rating: 4.8
  },
  "Phan Thị Mai": {
    licenseType: "GPLX hạng D",
    birthday: "20/11/1991",
    address: "Số 18, Đường Quang Trung, Hưng Yên",
    email: "mai.phan@busvip.com",
    achievements: ["7 năm kinh nghiệm", "Hỗ trợ tài xế tốt", "400+ chuyến xe"],
    totalTrips: 400,
    rating: 4.7
  },
  "Cao Thị Ngọc": {
    licenseType: "GPLX hạng D",
    birthday: "08/03/1993",
    address: "Số 42, Đường Lý Thường Kiệt, Bắc Ninh",
    email: "ngoc.cao@busvip.com",
    achievements: ["6 năm kinh nghiệm", "Cẩn thận, tỉ mỉ", "380+ chuyến xe"],
    totalTrips: 380,
    rating: 4.9
  },
  "Đinh Thị Oanh": {
    licenseType: "GPLX hạng D",
    birthday: "15/07/1994",
    address: "Số 56, Đường Trần Nhân Tông, Vĩnh Phúc",
    email: "oanh.dinh@busvip.com",
    achievements: ["5 năm kinh nghiệm", "Nhanh nhẹn, hoàn thành tốt", "350+ chuyến xe"],
    totalTrips: 350,
    rating: 4.6
  }
};

export default function EmployeeInfoSection() {
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [topDrivers, setTopDrivers] = useState<TopDriver[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"drivers" | "assistants">("drivers");
  const [showList, setShowList] = useState(false); // Track xem đã click tab chưa

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allEmployees, experiencedDrivers] = await Promise.all([
        getAllEmployees(),
        getTopExperiencedDrivers()
      ]);
      setEmployees(allEmployees);
      setTopDrivers(experiencedDrivers.filter(d => d.experienceYears).slice(0, 5) as TopDriver[]);
      setSelectedEmployee(null);
      } catch {
        toast.error("Không thể tải danh sách nhân viên. Vui lòng thử lại.");
      } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEmployees = employees.filter(e => e.employeeType === activeTab.toUpperCase());

  const handleTabClick = (tab: "drivers" | "assistants") => {
    setActiveTab(tab);
    setShowList(true);
    setSelectedEmployee(null);
  };

  const handleEmployeeClick = (emp: EmployeeInfo) => {
    setSelectedEmployee(emp);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getYearsText = (years?: number) => {
    if (!years) return "Chưa có thông tin";
    return `${years} năm kinh nghiệm`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "DRIVER": return "Tài xế";
      case "ASSISTANT": return "Phụ xe";
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "DRIVER": return "bg-rose-100 text-rose-700 border-rose-200";
      case "ASSISTANT": return "bg-pink-100 text-pink-700 border-pink-200";
      default: return "bg-purple-100 text-purple-700 border-purple-200";
    }
  };

  const getVipInfo = (name: string) => {
    return VIP_INFO[name] || {
      licenseType: "GPLX hạng D",
      birthday: "N/A",
      address: "N/A",
      email: "N/A",
      achievements: ["Kinh nghiệm tốt"],
      totalTrips: 0,
      rating: 4.5
    };
  };

  if (isLoading) {
    return (
      <section className="mt-8 rounded-2xl bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 p-6 shadow-lg border border-pink-100">
        <div className="flex items-center justify-center py-16">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"></div>
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-pink-300 opacity-20"></div>
          </div>
          <span className="ml-4 text-pink-600 font-medium">Đang tải thông tin nhân sự...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="mb-6 rounded-2xl border border-rose-200 bg-gradient-to-r from-white via-rose-50 to-pink-100 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-rose-100 p-3 shadow-sm">
              <Users className="h-8 w-8 text-rose-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-rose-700">Thông tin nhân sự</h2>
              <p className="text-rose-500">Hồ sơ chi tiết tài xế và phụ xe</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="rounded-full border border-rose-200 bg-white px-4 py-2 shadow-sm">
              <span className="font-medium text-rose-600">{employees.length} nhân viên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-white p-1.5 shadow-md border border-pink-100">
        <button
          onClick={() => handleTabClick("drivers")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all duration-200 ${
            activeTab === "drivers"
              ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md"
              : "text-slate-600 hover:bg-pink-50"
          }`}
        >
          <Shield className="h-5 w-5" />
          Tài xế ({employees.filter(e => e.employeeType === "DRIVER").length})
        </button>
        <button
          onClick={() => handleTabClick("assistants")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all duration-200 ${
            activeTab === "assistants"
              ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md"
              : "text-slate-600 hover:bg-pink-50"
          }`}
        >
          <Users className="h-5 w-5" />
          Phụ xe ({employees.filter(e => e.employeeType === "ASSISTANT").length})
        </button>
      </div>

      {/* Content: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee List - Hiện khi click tab */}
        <div className={`lg:col-span-2 transition-all duration-300 ${showList ? 'opacity-100' : 'opacity-0'}`}>
          {showList && (
            <div className="space-y-2">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => handleEmployeeClick(emp)}
                  className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg ${
                    selectedEmployee?.id === emp.id
                      ? "border-pink-400 bg-gradient-to-r from-rose-50 to-pink-50 shadow-md"
                      : "border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`relative ${
                        emp.employeeType === "DRIVER" 
                          ? "bg-gradient-to-br from-rose-400 to-pink-500" 
                          : "bg-gradient-to-br from-pink-400 to-fuchsia-500"
                      } h-12 w-12 rounded-full flex items-center justify-center shadow-md`}>
                        <span className="text-lg font-bold text-white">
                          {emp.fullName.split(" ").pop()?.charAt(0) || "?"}
                        </span>
                        {emp.experienceYears && emp.experienceYears >= 10 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                            <Star className="h-3 w-3 text-yellow-800" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-pink-700 transition-colors">
                          {emp.fullName}
                        </h4>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {emp.phone || "Chưa có SĐT"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {emp.experienceYears && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                          <Award className="h-3 w-3" />
                          {emp.experienceYears} năm
                        </span>
                      )}
                      <ChevronRight className={`h-5 w-5 text-pink-400 transition-transform group-hover:translate-x-1 ${
                        selectedEmployee?.id === emp.id ? "rotate-90" : ""
                      }`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Selected Employee Detail - Hiện khi click vào tên cụ thể */}
        <div className="lg:col-span-1">
          {selectedEmployee ? (
            <div className="sticky top-4 rounded-2xl bg-gradient-to-br from-white via-rose-50 to-pink-50 p-6 shadow-xl border border-pink-200">
              {/* Profile Header */}
              <div className="text-center mb-5">
                <div className={`mx-auto mb-3 h-20 w-20 rounded-full flex items-center justify-center shadow-lg ${
                  selectedEmployee.employeeType === "DRIVER" 
                    ? "bg-gradient-to-br from-rose-400 to-pink-500" 
                    : "bg-gradient-to-br from-pink-400 to-fuchsia-500"
                }`}>
                  <span className="text-2xl font-bold text-white">
                    {selectedEmployee.fullName.split(" ").pop()?.charAt(0) || "?"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">{selectedEmployee.fullName}</h3>
                <p className="text-sm text-pink-600 flex items-center justify-center gap-1 mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {selectedEmployee.phone || "Chưa có SĐT"}
                </p>
                <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${getTypeBadgeClass(selectedEmployee.employeeType)}`}>
                  {getTypeLabel(selectedEmployee.employeeType)}
                </span>
              </div>

              {/* VIP Info Section */}
              {(() => {
                const vipInfo = getVipInfo(selectedEmployee.fullName);
                return (
                  <div className="space-y-4">
                    {/* VIP Badge */}
                    {selectedEmployee.experienceYears && selectedEmployee.experienceYears >= 10 && (
                      <div className="rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 p-4 border border-amber-200">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-amber-400 p-2">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Tài xế Senior</p>
                            <p className="text-lg font-bold text-amber-800">{selectedEmployee.experienceYears} năm kinh nghiệm</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIP Info Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                        <div className="rounded-full bg-rose-100 p-2">
                          <MapPin className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Quê quán</p>
                          <p className="font-semibold text-slate-800">{selectedEmployee.hometown || "Chưa cập nhật"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                        <div className="rounded-full bg-blue-100 p-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Giấy phép</p>
                          <p className="font-semibold text-slate-800">{vipInfo.licenseType}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                        <div className="rounded-full bg-green-100 p-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Ngày sinh</p>
                          <p className="font-semibold text-slate-800">{vipInfo.birthday}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                        <div className="rounded-full bg-fuchsia-100 p-2">
                          <Mail className="h-4 w-4 text-fuchsia-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="font-semibold text-slate-800 text-sm">{vipInfo.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                        <div className="rounded-full bg-purple-100 p-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Ngày gia nhập</p>
                          <p className="font-semibold text-slate-800">{formatDate(selectedEmployee.joinDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-pink-100">
                        <div className="rounded-full bg-amber-100 p-2">
                          <Briefcase className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Tổng chuyến đã đi</p>
                          <p className="font-semibold text-slate-800">{vipInfo.totalTrips}+ chuyến</p>
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="rounded-xl bg-gradient-to-r from-pink-50 to-fuchsia-50 p-4 border border-pink-200">
                        <p className="text-xs font-medium text-pink-700 mb-2">Thành tích:</p>
                        <div className="flex flex-wrap gap-1">
                          {vipInfo.achievements.map((ach, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-pink-600 border border-pink-200">
                              <Star className="h-3 w-3" />
                              {ach}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="sticky top-4 rounded-2xl border border-pink-200 bg-gradient-to-br from-white via-rose-50 to-pink-50 p-8 text-center shadow-md">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-pink-100 flex items-center justify-center">
                <User className="h-8 w-8 text-pink-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-700 mb-2">Chọn nhân viên</h4>
              <p className="text-sm text-slate-500">
                Click vào tên nhân viên bên trái để xem thông tin chi tiết
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Shield className="h-5 w-5 text-rose-400" />
                <Users className="h-5 w-5 text-pink-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Experienced Drivers Section */}
      {topDrivers.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 p-2 shadow-md">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Top Tài xế Kinh nghiệm nhất</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topDrivers.map((driver, index) => (
              <div
                key={driver.id}
                className="group relative rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-lg border border-amber-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Rank Badge */}
                <div className={`absolute -top-3 -right-3 h-8 w-8 rounded-full flex items-center justify-center shadow-lg font-bold text-sm ${
                  index === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white" :
                  index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                  index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                  "bg-gradient-to-br from-rose-400 to-pink-500 text-white"
                }`}>
                  #{index + 1}
                </div>

                {/* Avatar */}
                <div className="mb-4 flex justify-center">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                      <span className="text-2xl font-bold text-white">
                        {driver.fullName.split(" ").pop()?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-green-400 h-5 w-5 border-2 border-white"></div>
                  </div>
                </div>

                {/* Info */}
                <div className="text-center">
                  <h4 className="font-bold text-slate-800 truncate">{driver.fullName}</h4>
                  <p className="mt-1 flex items-center justify-center gap-1 text-sm text-amber-700">
                    <Award className="h-4 w-4" />
                    <span className="font-semibold">{driver.experienceYears} năm</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{driver.hometown || "Việt Nam"}</p>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
