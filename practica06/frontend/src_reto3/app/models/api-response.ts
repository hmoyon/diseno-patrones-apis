// Formato universal de respuesta del backend (Response Wrapper)
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: ApiErrorDetail[];
  timestamp: string;
}
