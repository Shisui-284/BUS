import axios, { AxiosError } from "axios";

interface ApiErrorBody {
  message?: string;
  error?: string;
  status?: number;
}

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      "Đã xảy ra lỗi không xác định"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định";
}

export function extractApiStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  return (error as AxiosError<ApiErrorBody>).response?.status;
}
