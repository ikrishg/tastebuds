export class TastebudsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TastebudsError";
  }
}

export const handleApiError = (error: any): string => {
  if (error?.error) {
    return `Last.fm API error: ${error.message || error.error}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};
