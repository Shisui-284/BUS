// ============================================================================
// FEEDBACK API — Module: Khiếu nại / Phản hồi (FE)
// 3 nhóm hàm:
//   - CUSTOMER: createFeedback, getMyFeedbacks, replyAsCustomer, closeAsCustomer
//   - ADMIN:    getAdminFeedbacks, getStats, replyAsAdmin, updateAdminFeedbackStatus, delete
//   - SSE:      subscribe admin nhận notification real-time
// ============================================================================

import apiClient from "./apiClient";

export type FeedbackCategory = "COMPLAINT" | "SUGGESTION" | "PRAISE" | "QUESTION" | "OTHER";
export type FeedbackStatus = "NEW" | "READ" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type FeedbackPriority = "LOW" | "MEDIUM" | "HIGH";
export type AuthorRole = "CUSTOMER" | "ADMIN";

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  COMPLAINT: "Khiếu nại",
  SUGGESTION: "Góp ý",
  PRAISE: "Khen ngợi",
  QUESTION: "Câu hỏi",
  OTHER: "Khác",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "Mới",
  READ: "Đã đọc",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
};

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

export interface FeedbackReply {
  id: number;
  authorId: number;
  authorUsername: string;
  authorFullName: string;
  authorRole: AuthorRole;
  content: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: number;
  userId: number;
  username: string;
  userFullName: string;
  userEmail: string;
  category: FeedbackCategory;
  categoryLabel: string;
  subject: string;
  content: string;
  relatedTripId: number | null;
  relatedTripLabel: string | null;
  rating: number | null;
  status: FeedbackStatus;
  statusLabel: string;
  priority: FeedbackPriority;
  priorityLabel: string;
  createdAt: string;
  updatedAt: string;
  replies: FeedbackReply[];
  replyCount: number;
}

export interface FeedbackStats {
  total: number;
  newCount: number;
  readCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  byCategory: Record<string, number>;
  averageRating: number | null;
}

export interface CreateFeedbackPayload {
  category: FeedbackCategory;
  subject: string;
  content: string;
  relatedTripId?: number | null;
  rating?: number | null;
}

export interface CreateReplyPayload {
  content: string;
}

export interface UpdateFeedbackStatusPayload {
  status: FeedbackStatus;
  priority?: FeedbackPriority;
}

export interface TripOption {
  id: number;
  label: string;
}

// ==================== CUSTOMER ====================

export async function createFeedback(payload: CreateFeedbackPayload): Promise<FeedbackItem> {
  const res = await apiClient.post<FeedbackItem>("/private/feedbacks", payload);
  return res.data;
}

export async function getMyFeedbacks(): Promise<FeedbackItem[]> {
  const res = await apiClient.get<FeedbackItem[]>("/private/feedbacks/me");
  return res.data;
}

export async function getMyFeedbackById(id: number): Promise<FeedbackItem> {
  const res = await apiClient.get<FeedbackItem>(`/private/feedbacks/${id}`);
  return res.data;
}

export async function replyAsCustomer(id: number, content: string): Promise<FeedbackItem> {
  const res = await apiClient.post<FeedbackItem>(`/private/feedbacks/${id}/reply`, { content });
  return res.data;
}

export async function closeAsCustomer(id: number): Promise<FeedbackItem> {
  const res = await apiClient.put<FeedbackItem>(`/private/feedbacks/${id}/close`);
  return res.data;
}

// ==================== ADMIN ====================

export async function getAdminFeedbacks(params?: {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  tripId?: number;
  keyword?: string;
}): Promise<FeedbackItem[]> {
  const res = await apiClient.get<FeedbackItem[]>("/admin/feedbacks", { params });
  return res.data;
}

export async function getAdminFeedbackStats(): Promise<FeedbackStats> {
  const res = await apiClient.get<FeedbackStats>("/admin/feedbacks/stats");
  return res.data;
}

export async function getAdminFeedbackById(id: number): Promise<FeedbackItem> {
  const res = await apiClient.get<FeedbackItem>(`/admin/feedbacks/${id}`);
  return res.data;
}

export async function replyAsAdmin(id: number, content: string): Promise<FeedbackItem> {
  const res = await apiClient.post<FeedbackItem>(`/admin/feedbacks/${id}/reply`, { content });
  return res.data;
}

export async function updateAdminFeedbackStatus(
  id: number,
  payload: UpdateFeedbackStatusPayload,
): Promise<FeedbackItem> {
  const res = await apiClient.patch<FeedbackItem>(`/admin/feedbacks/${id}/status`, payload);
  return res.data;
}

export async function deleteAdminFeedback(id: number): Promise<void> {
  await apiClient.delete(`/admin/feedbacks/${id}`);
}

// ==================== SSE EVENT ====================

export interface FeedbackCreatedEvent {
  feedbackId: number;
  username: string;
  userFullName: string;
  category: string;
  subject: string;
  rating: number | null;
  createdAt: string;
}