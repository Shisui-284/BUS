import React, { useEffect, useState } from 'react';
import { AdminTicket } from '../../types';
import { getAllTicketsForAdmin, confirmTicket, cancelTicketByAdmin } from '../../api/admin';
import StatusBadge from '../../components/ui/StatusBadge';
import { Search, Download, Filter, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý tìm kiếm và bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // State quản lý hành động xác nhận / hủy vé
  const [actionTicketId, setActionTicketId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getAllTicketsForAdmin();
        setTickets(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách vé:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  // Lọc vé kết hợp cả từ khóa tìm kiếm VÀ trạng thái
  const filteredTickets = tickets.filter(t => {
    const matchSearch =
      (t.passengerName && t.passengerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.passengerPhone && t.passengerPhone.includes(searchTerm)) ||
      t.ticketId.toString().includes(searchTerm);
      
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleConfirm = async (ticketId: number) => {
    if (!window.confirm('Xác nhận đã gọi điện và thông tin chính xác cho vé này?')) return;
    setActionTicketId(ticketId);
    try {
      await confirmTicket(ticketId);
      setTickets(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status: 'CONFIRMED' } : t));
      toast.success('Đã xác nhận vé thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Xác nhận vé thất bại');
    } finally {
      setActionTicketId(null);
    }
  };

  const handleCancel = async (ticketId: number) => {
    if (!window.confirm('Hủy vé này? Lịch sử đặt vé vẫn được lưu lại.')) return;
    setActionTicketId(ticketId);
    try {
      await cancelTicketByAdmin(ticketId);
      setTickets(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status: 'CANCELLED' } : t));
      toast.success('Đã hủy vé thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Hủy vé thất bại');
    } finally {
      setActionTicketId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-1">TICKET MANAGEMENT</h2>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý vé đặt</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi, kiểm tra thông tin hành khách và vé trên toàn hệ thống.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download size={20} />
          Xuất dữ liệu
        </button>
      </div>

      {/* Thanh tìm kiếm và Bộ lọc */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên khách, SĐT, mã vé..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown Lọc trạng thái */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-gray-400" size={20} />
          <select
            className="w-full md:w-auto py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="HOLD">Chờ xác nhận (HOLD)</option>
            <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
            <option value="PAID">Đã thanh toán (PAID)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
            <option value="BOOKED">Đã giữ chỗ (BOOKED)</option>
            <option value="EXPIRED">Hết hạn (EXPIRED)</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Mã vé</th>
                <th className="px-6 py-4 font-medium">Khách hàng & Liên hệ</th>
                <th className="px-6 py-4 font-medium">Chuyến đi & Thời gian</th>
                <th className="px-6 py-4 font-medium">Xe & Ghế</th>
                <th className="px-6 py-4 font-medium">Giờ đặt</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Không tìm thấy vé nào phù hợp.</td></tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">#{ticket.ticketId}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{ticket.passengerName}</div>
                      <div className="text-gray-500">{ticket.passengerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-blue-600">{ticket.routeName}</div>
                      <div className="text-gray-500">{format(new Date(ticket.departureTime), 'HH:mm dd/MM/yyyy')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{ticket.busInfo}</div>
                      <div className="text-gray-500">Ghế: <span className="font-bold">{ticket.seatNumber}</span></div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(ticket.bookedAt), 'HH:mm dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <StatusBadge status={ticket.status} />
                        {ticket.status === 'HOLD' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirm(ticket.ticketId)}
                              disabled={actionTicketId === ticket.ticketId}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {actionTicketId === ticket.ticketId ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              Xác nhận
                            </button>
                            <button
                              onClick={() => handleCancel(ticket.ticketId)}
                              disabled={actionTicketId === ticket.ticketId}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <X size={12} />
                              Hủy
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsPage;