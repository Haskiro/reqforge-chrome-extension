export const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName) return '?';
  return fullName.trim().charAt(0).toUpperCase();
};
