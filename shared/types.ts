export type SuccessResponse<T = void> = {
  success: true;
  message: string;
} & (T extends void ? unknown : { data: T });

export type ErrorResponse = {
  success: false;
  error: string;
  isFormError?: boolean;
};
