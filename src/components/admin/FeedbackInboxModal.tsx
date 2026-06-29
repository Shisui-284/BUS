// ============================================================================
// FEEDBACK INBOX MODAL — Hộp thư khiếu nại (Admin)
// Tính năng: xem DS feedback, reply, đổi status (NEW → READ → IN_PROGRESS → RESOLVED → CLOSED)
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  Search,
  X,
  Send,
  Star,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ThumbsUp,
  HelpCircle,
  AlertCircle,
  MoreHorizontal,
  RefreshCcw,
  Loader2,
  MessageSquare,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  FeedbackItem,
  FeedbackStatus,
  FeedbackCategory,
  FeedbackPriority,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_CATEGORY_LABELS,
  getAdminFeedbacks,
  getAdminFeedbackById,
  replyAsAdmin,
  updateAdminFeedbackStatus,
  deleteAdminFeedback,
} from "../../api/feedback";
import { extractApiErrorMessage } from "../../utils/apiError";

const STATUS_OPTIONS: Array<{ value: FeedbackStatus | ""; label: string; color: string }> = [
  { value: "", label: "Tất cả", color: "bg-slate-100 text-slate-300" },
  { value: "NEW", label: FEEDBACK_STATUS_LABELS.NEW, color: "bg-rose-500/20 text-rose-300" },
  { value: "READ", label: FEEDBACK_STATUS_LABELS.READ, color: "bg-blue-500/20 text-blue-300" },
  { value: "IN_PROGRESS", label: FEEDBACK_STATUS_LABELS.IN_PROGRESS, color: "bg-amber-500/20 text-amber-300" },
  { value: "RESOLVED", label: FEEDBACK_STATUS_LABELS.RESOLVED, color: "bg-emerald-500/20 text-emerald-300" },
  { value: "CLOSED", label: FEEDBACK_STATUS_LABELS.CLOSED, color: "bg-slate-500/20 text-slate-400" },
];

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  NEW: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  READ: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  CLOSED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  LOW: "bg-slate-500/20 text-slate-300",
  MEDIUM: "bg-blue-500/20 text-blue-300",
  HIGH: "bg-rose-500/30 text-rose-200",
};

const CATEGORY_ICONS: Record<FeedbackCategory, React.ReactNode> = {
  COMPLAINT: <AlertCircle className="h-3.5 w-3.5" />,
  SUGGESTION: <Sparkles className="h-3.5 w-3.5" />,
  PRAISE: <ThumbsUp className="h-3.5 w-3.5" />,
  QUESTION: <HelpCircle className="h-3.5 w-3.5" />,
  OTHER: <MoreHorizontal className="h-3.5 w-3.5" />,
};

const CATEGORY_GRADIENT: Record<FeedbackCategory, string> = {
  COMPLAINT: "from-rose-500 to-pink-500",
  SUGGESTION: "from-blue-500 to-cyan-500",
  PRAISE: "from-emerald-500 to-teal-500",
  QUESTION: "from-amber-500 to-orange-500",
  OTHER: "from-slate-500 to-slate-600",
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface FeedbackInboxModalProps {
  /** Optional filter theo trip — khi admin mở từ 1 chuyến cụ thể */
  initialTripId?: number | null;
  /** Pre-select feedback id (VD: từ SSE event) */
  initialFeedbackId?: number | null;
  onClose: () => void;
  onChanged?: () => void;
}

export default function FeedbackInboxModal({
  initialTripId,
  initialFeedbackId,
  onClose,
  onChanged,
}: FeedbackInboxModalProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(initialFeedbackId ?? null);
  const [selectedDetail, setSelectedDetail] = useState<FeedbackItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "">("NEW");
  const [searchKw, setSearchKw] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminFeedbacks({
        status: filterStatus || undefined,
        tripId: initialTripId ?? undefined,
        keyword: searchKw.trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không tải được danh sách phản hồi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, initialTripId]);

  // Load detail khi chọn feedback
  useEffect(() => {
    if (selectedId === null) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getAdminFeedbackById(selectedId)
      .then((d) => {
        if (!cancelled) setSelectedDetail(d);
      })
      .catch((err) => toast.error(extractApiErrorMessage(err) || "Không tải được chi tiết"))
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const counts = useMemo(() => {
    const all = items;
    return {
      total: all.length,
      new: all.filter((f) => f.status === "NEW").length,
      inProgress: all.filter((f) => f.status === "IN_PROGRESS").length,
    };
  }, [items]);

  const handleReply = async () => {
    if (!selectedDetail || !replyText.trim()) return;
    setSending(true);
    try {
      const updated = await replyAsAdmin(selectedDetail.id, replyText.trim());
      setSelectedDetail(updated);
      setReplyText("");
      // Update item trong list
      setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, status: updated.status, replyCount: updated.replyCount } : it)));
      toast.success("Đã gửi phản hồi tới khách hàng");
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không gửi được phản hồi");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (!selectedDetail) return;
    try {
      const updated = await updateAdminFeedbackStatus(selectedDetail.id, {
        status: newStatus,
      });
      setSelectedDetail(updated);
      setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, status: updated.status } : it)));
      toast.success("Đã cập nhật trạng thái");
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không cập nhật được");
    }
  };

  const handlePriorityChange = async (newPriority: FeedbackPriority) => {
    if (!selectedDetail) return;
    try {
      const updated = await updateAdminFeedbackStatus(selectedDetail.id, {
        status: selectedDetail.status,
        priority: newPriority,
      });
      setSelectedDetail(updated);
      toast.success("Đã cập nhật độ ưu tiên");
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không cập nhật được");
    }
  };

  const handleDelete = async () => {
    if (!selectedDetail) return;
    if (!window.confirm("Xóa phản hồi này? Hành động không thể hoàn tác.")) return;
    try {
      await deleteAdminFeedback(selectedDetail.id);
      toast.success("Đã xóa");
      setSelectedId(null);
      setSelectedDetail(null);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || "Không xóa được");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden border border-white/10 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Phản hồi khách hàng</h2>
              <p className="text-xs text-blue-200">
                {initialTripId
                  ? `Phản hồi liên quan đến chuyến #${initialTripId}`
                  : "Tất cả phản hồi từ khách hàng"}
                {" · "}
                {counts.total} phản hồi
                {counts.new > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-[10px] font-bold">
                    {counts.new} mới
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 hover:bg-white/20 rounded-xl transition"
              title="Tải lại"
            >
              <RefreshCcw className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: list */}
          <div className="w-96 border-r border-white/10 flex flex-col bg-slate-900/40">
            {/* Filters */}
            <div className="p-3 border-b border-white/10 space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchKw}
                  onChange={(e) => setSearchKw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Tìm theo tên, nội dung..."
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                      filterStatus === opt.value
                        ? "bg-blue-500 text-white shadow"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                    {opt.value === "NEW" && counts.new > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold">
                        {counts.new}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Không có phản hồi nào</p>
                </div>
              ) : (
                items.map((fb) => {
                  const active = selectedId === fb.id;
                  return (
                    <button
                      key={fb.id}
                      onClick={() => setSelectedId(fb.id)}
                      className={`w-full text-left p-3 border-b border-white/5 transition-colors ${
                        active ? "bg-blue-500/20" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${CATEGORY_GRADIENT[fb.category]} text-white`}
                        >
                          {CATEGORY_ICONS[fb.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm font-bold text-white truncate">
                              {fb.userFullName || fb.username}
                            </p>
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${STATUS_COLORS[fb.status]}`}
                            >
                              {fb.status === "NEW" && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                              {fb.statusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{fb.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-9">
                        {fb.rating && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {fb.rating}
                          </span>
                        )}
                        {fb.replyCount > 0 && (
                          <span className="text-[10px] text-slate-500">
                            💬 {fb.replyCount}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">
                          {fmtTime(fb.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: detail */}
          <div className="flex-1 flex flex-col bg-slate-900/20">
            {!selectedDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
                <Inbox className="h-16 w-16 mb-3 opacity-30" />
                <p className="text-sm">Chọn một phản hồi để xem chi tiết</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tổng cộng {counts.total} phản hồi
                </p>
              </div>
            ) : detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div className="p-4 border-b border-white/10 shrink-0">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENT[selectedDetail.category]} text-white shadow-lg`}
                    >
                      {CATEGORY_ICONS[selectedDetail.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${STATUS_COLORS[selectedDetail.status]}`}
                        >
                          {selectedDetail.statusLabel}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[selectedDetail.priority]}`}
                        >
                          Ưu tiên: {selectedDetail.priorityLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {FEEDBACK_CATEGORY_LABELS[selectedDetail.category]}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-white">
                        {selectedDetail.subject}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                        <span>👤 {selectedDetail.userFullName || selectedDetail.username}</span>
                        {selectedDetail.userEmail && (
                          <span>· {selectedDetail.userEmail}</span>
                        )}
                        {selectedDetail.relatedTripLabel && (
                          <span className="inline-flex items-center gap-1 text-cyan-300">
                            <MapPin className="h-3 w-3" />
                            {selectedDetail.relatedTripLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedDetail.rating && (
                      <div className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-3 w-3 ${
                                selectedDetail.rating! >= n
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-600"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold">
                          {selectedDetail.rating}/5
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select
                      value={selectedDetail.status}
                      onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
                      className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((s) => (
                        <option key={s} value={s} className="text-slate-900">
                          {FEEDBACK_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedDetail.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as FeedbackPriority)}
                      className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(Object.keys(FEEDBACK_PRIORITY_LABELS) as FeedbackPriority[]).map((p) => (
                        <option key={p} value={p} className="text-slate-900">
                          Ưu tiên: {FEEDBACK_PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1 text-xs text-rose-300 hover:bg-rose-500/20 rounded-lg px-2 py-1 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      Xóa
                    </button>
                  </div>
                </div>

                {/* Conversation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Original message from customer */}
                  <div className="flex gap-2">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
                      {(selectedDetail.userFullName || selectedDetail.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-bold text-pink-300">
                          {selectedDetail.userFullName || selectedDetail.username}
                        </span>
                        <span>· Khách hàng</span>
                        <span>· {fmtTime(selectedDetail.createdAt)}</span>
                      </div>
                      <div className="mt-1 rounded-2xl rounded-tl-sm bg-pink-500/10 border border-pink-500/20 p-3 text-sm text-slate-100 whitespace-pre-wrap">
                        {selectedDetail.content}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedDetail.replies.map((rep) => {
                    const isAdmin = rep.authorRole === "ADMIN";
                    return (
                      <div key={rep.id} className={`flex gap-2 ${isAdmin ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            isAdmin
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                              : "bg-gradient-to-br from-pink-500 to-rose-500"
                          }`}
                        >
                          {(rep.authorFullName || rep.authorUsername).charAt(0).toUpperCase()}
                        </div>
                        <div className={`flex-1 ${isAdmin ? "text-right" : ""}`}>
                          <div className="flex items-center gap-2 text-xs text-slate-400" style={{ justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                            <span className={`font-bold ${isAdmin ? "text-blue-300" : "text-pink-300"}`}>
                              {rep.authorFullName || rep.authorUsername}
                            </span>
                            <span>· {isAdmin ? "Quản trị viên" : "Khách hàng"}</span>
                            <span>· {fmtTime(rep.createdAt)}</span>
                          </div>
                          <div
                            className={`mt-1 inline-block rounded-2xl p-3 text-sm text-slate-100 whitespace-pre-wrap text-left max-w-[80%] ${
                              isAdmin
                                ? "rounded-tr-sm bg-blue-500/10 border border-blue-500/20"
                                : "rounded-tl-sm bg-pink-500/10 border border-pink-500/20"
                            }`}
                          >
                            {rep.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply input */}
                <div className="p-3 border-t border-white/10 shrink-0">
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleReply();
                        }
                      }}
                      rows={2}
                      placeholder="Nhập phản hồi... (Cmd/Ctrl+Enter để gửi)"
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || sending}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 text-sm font-semibold text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span className="hidden sm:inline">Gửi</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}