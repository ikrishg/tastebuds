export const formatTime = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export const handleAuthError = (): void => {
  localStorage.removeItem("username");
  for (const k of Object.keys(localStorage)) if (k.startsWith("tb:")) localStorage.removeItem(k);
  location.href = "/";
};

export const isAuthError = (errorMessage: string): boolean => {
  return (
    errorMessage.includes("Unauthorized") ||
    errorMessage.includes("401") ||
    errorMessage.includes("Invalid session")
  );
};

