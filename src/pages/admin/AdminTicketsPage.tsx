// ============================================================================
// ADMIN TICKETS PAGE — Quản lý vé (Admin)
// Tính năng: xem DS vé, xác nhận vé, hủy vé, mark paid (cho COD)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { AdminTicket } from '../../types';
import { getAllTicketsForAdmin, confirmTicket, cancelTicketByAdmin, markTicketAsPaid } from '../../api/admin';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { Search, Download, Filter, Check, X, Loader2, MapPin, Flag } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý tìm kiếm và bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // State quản lý hành động xác nhận / hủy vé
  const [actionTicketId, setActionTicketId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getAllTicketsForAdmin();
        setTickets(data);
      } catch {
        toast.error("Lỗi khi tải danh sách vé. Vui lòng thử lại.");
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedTickets = filteredTickets.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const handleConfirm = async (ticketId: number) => {
    if (!window.confirm('Xác nhận đã gọi điện và thông tin chính xác cho vé này? Khách vẫn có thể thanh toán sau.')) return;
    setActionTicketId(ticketId);
    try {
      await confirmTicket(ticketId);
      setTickets(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status: 'CONFIRMED' } : t));
      toast.success('Đã xác nhận giữ chỗ thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Xác nhận vé thất bại');
    } finally {
      setActionTicketId(null);
    }
  };

  const handleMarkPaid = async (ticketId: number) => {
    if (!window.confirm('Xác nhận khách đã thanh toán (chuyển khoản hoặc tiền mặt)?')) return;
    setActionTicketId(ticketId);
    try {
      await markTicketAsPaid(ticketId);
      setTickets(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status: 'PAID' } : t));
      toast.success('Đã xác nhận thanh toán thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cập nhật thanh toán thất bại');
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50/80 to-purple-50">
      <div className="relative z-10 space-y-6 p-6">
        {/* Header — gradient xanh tím sáng, đồng bộ với AdminTripsPage */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-7 shadow-xl shadow-indigo-200/40">
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="white" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Ticket Management</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Quản lý vé đặt</h1>
              <p className="text-blue-50/90 text-sm mt-2">
                Theo dõi, kiểm tra thông tin hành khách và xác nhận thanh toán trên toàn hệ thống.
              </p>
            </div>

            <button className="inline-flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              <Download className="w-5 h-5" />
              <span>Xuất dữ liệu</span>
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm và Bộ lọc */}
        <div className="bg-white rounded-2xl p-4 shadow-md border border-indigo-100/60 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên khách, SĐT, mã vé..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="text-indigo-500" size={20} />
            <select
              className="w-full md:w-auto py-2.5 px-4 border border-indigo-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 font-medium shadow-sm cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option className="bg-white text-slate-800 font-medium py-2" value="ALL">Tất cả trạng thái</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="HOLD">Chờ xác nhận (HOLD)</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="PAID">Đã thanh toán (PAID)</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="CANCELLED">Đã hủy (CANCELLED)</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="BOOKED">Đã giữ chỗ (BOOKED)</option>
              <option className="bg-white text-slate-800 font-medium py-2" value="EXPIRED">Hết hạn (EXPIRED)</option>
            </select>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="bg-white rounded-2xl shadow-md border border-indigo-100/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 text-sm text-indigo-700">
                  <th className="px-6 py-4 font-semibold">Mã vé</th>
                  <th className="px-6 py-4 font-semibold">Khách hàng & Liên hệ</th>
                  <th className="px-6 py-4 font-semibold">Chuyến đi & Thời gian</th>
                  <th className="px-6 py-4 font-semibold">Điểm đón / Điểm trả</th>
                  <th className="px-6 py-4 font-semibold">Xe & Ghế</th>
                  <th className="px-6 py-4 font-semibold">Giờ đặt</th>
                  <th className="px-6 py-4 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                ) : filteredTickets.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Không tìm thấy vé nào phù hợp.</td></tr>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <tr key={ticket.ticketId} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-indigo-700 align-top">#{ticket.ticketId}</td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-slate-900">{ticket.passengerName}</div>
                        <div className="text-slate-500">{ticket.passengerPhone}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-blue-600">{ticket.routeName}</div>
                        <div className="text-slate-500">{format(new Date(ticket.departureTime), 'HH:mm dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {(ticket.pickupPoint || ticket.dropoffPoint) ? (
                          <div className="space-y-1.5 max-w-xs">
                            {ticket.pickupPoint && (
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Đón</div>
                                  <div className="text-slate-700 text-xs leading-snug break-words">
                                    {ticket.pickupPoint}
                                  </div>
                                </div>
                              </div>
                            )}
                            {ticket.dropoffPoint && (
                              <div className="flex items-start gap-1.5">
                                <Flag className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">Trả</div>
                                  <div className="text-slate-700 text-xs leading-snug break-words">
                                    {ticket.dropoffPoint}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa chọn</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-slate-900">{ticket.busInfo}</div>
                        <div className="text-slate-500">Ghế: <span className="font-bold text-indigo-600">{ticket.seatNumber}</span></div>
                      </td>
                      <td className="px-6 py-4 align-top text-slate-500">
                        {ticket.bookedAt ? format(new Date(ticket.bookedAt), 'HH:mm dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={ticket.status} />
                          {(ticket.status === 'HOLD' || ticket.status === 'CONFIRMED') && (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {ticket.status === 'HOLD' && (
                                <button
                                  onClick={() => handleConfirm(ticket.ticketId)}
                                  disabled={actionTicketId === ticket.ticketId}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                  {actionTicketId === ticket.ticketId ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  Giữ chỗ
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleMarkPaid(ticket.ticketId)}
                                disabled={actionTicketId === ticket.ticketId}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 transition-all"
                              >
                                {actionTicketId === ticket.ticketId ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Đã thu tiền
                              </button>

                              {ticket.status === 'HOLD' && (
                                <button
                                  onClick={() => handleCancel(ticket.ticketId)}
                                  disabled={actionTicketId === ticket.ticketId}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md hover:from-rose-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                  <X size={12} />
                                  Hủy
                                </button>
                              )}
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
          
          {totalPages > 1 && (
            <div className="border-t border-indigo-50 bg-indigo-50/20">
              <Pagination 
                currentPage={validCurrentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsPage;