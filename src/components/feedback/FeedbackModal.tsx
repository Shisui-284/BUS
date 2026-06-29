// ============================================================================
// FEEDBACK MODAL — Modal khiếu nại / phản hồi (Customer)
// Category: COMPLAINT (khiếu nại) / SUGGESTION / PRAISE / QUESTION / OTHER
// ============================================================================

import { useEffect, useState } from "react";
import { Star, Send, X, MessageCircle, Sparkles, ThumbsUp, HelpCircle, AlertCircle, MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import {
  createFeedback,
  FEEDBACK_CATEGORY_LABELS,
  FeedbackCategory,
} from "../../api/feedback";
import { TicketRecord } from "../../api/customer";

interface FeedbackModalProps {
  tickets: TicketRecord[];
  /** Vé đang mở modal (sẽ pre-select trong dropdown). Có thể null = tự do chọn. */
  initialTicket?: TicketRecord | null;
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORY_OPTIONS: Array<{
  value: FeedbackCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  hint: string;
}> = [
  {
    value: "COMPLAINT",
    label: FEEDBACK_CATEGORY_LABELS.COMPLAINT,
    icon: <AlertCircle className="h-4 w-4" />,
    color: "from-rose-500 to-pink-500",
    hint: "Báo lỗi / sự cố",
  },
  {
    value: "SUGGESTION",
    label: FEEDBACK_CATEGORY_LABELS.SUGGESTION,
    icon: <Sparkles className="h-4 w-4" />,
    color: "from-blue-500 to-cyan-500",
    hint: "Đề xuất cải thiện",
  },
  {
    value: "PRAISE",
    label: FEEDBACK_CATEGORY_LABELS.PRAISE,
    icon: <ThumbsUp className="h-4 w-4" />,
    color: "from-emerald-500 to-teal-500",
    hint: "Khen nhân viên / dịch vụ",
  },
  {
    value: "QUESTION",
    label: FEEDBACK_CATEGORY_LABELS.QUESTION,
    icon: <HelpCircle className="h-4 w-4" />,
    color: "from-amber-500 to-orange-500",
    hint: "Thắc mắc cần giải đáp",
  },
  {
    value: "OTHER",
    label: FEEDBACK_CATEGORY_LABELS.OTHER,
    icon: <MoreHorizontal className="h-4 w-4" />,
    color: "from-slate-500 to-slate-600",
    hint: "Khác",
  },
];

const MAX_CONTENT = 2000;

export default function FeedbackModal({
  tickets,
  initialTicket,
  onClose,
  onCreated,
}: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>("SUGGESTION");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [tripId, setTripId] = useState<number | null>(
    initialTicket?.tripId ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTicket?.tripId) setTripId(initialTicket.tripId);
  }, [initialTicket]);

  const contentLeft = MAX_CONTENT - content.length;

  const tripOptions = (() => {
    const map = new Map<number, { id: number; label: string }>();
    tickets.forEach((t) => {
      if (!map.has(t.tripId)) {
        const date = t.departureTime
          ? new Date(t.departureTime).toLocaleDateString("vi-VN")
          : "";
        map.set(t.tripId, {
          id: t.tripId,
          label: `${t.origin || "?"} → ${t.destination || "?"}${date ? " · " + date : ""}`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.id - a.id);
  })();

  const canSubmit =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createFeedback({
        category,
        subject: subject.trim(),
        content: content.trim(),
        relatedTripId: tripId,
        rating: rating > 0 ? rating : null,
      });
      toast.success("Đã gửi phản hồi tới quản trị viên");
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Không thể gửi phản hồi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gửi phản hồi / Đánh giá</h2>
              <p className="text-xs text-pink-100">Phản hồi sẽ được admin xem và trả lời</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1.5 rounded-full transition"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Trip selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Chuyến liên quan <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <select
              value={tripId ?? ""}
              onChange={(e) =>
                setTripId(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50"
            >
              <option value="">— Không liên quan đến chuyến cụ thể —</option>
              {tripOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  Chuyến #{opt.id} · {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Loại phản hồi
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const active = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`relative overflow-hidden rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-pink-400 bg-pink-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${opt.color} text-white`}
                      >
                        {opt.icon}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold ${active ? "text-pink-700" : "text-slate-700"}`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {opt.hint}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Đánh giá <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hoverRating || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? 0 : n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        filled
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      } transition-colors`}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-sm font-semibold text-amber-600">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="Tóm tắt ngắn gọn vấn đề"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400 text-right">
              {subject.length}/150
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nội dung chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CONTENT}
              rows={5}
              placeholder="Mô tả chi tiết vấn đề, góp ý hoặc lời khen của bạn..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
              required
            />
            <p
              className={`mt-1 text-[11px] text-right ${
                contentLeft < 200 ? "text-amber-500" : "text-slate-400"
              }`}
            >
              Còn {contentLeft} ký tự
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Đang gửi..." : "Gửi phản hồi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}