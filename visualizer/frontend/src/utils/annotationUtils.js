// Color palette for different classes - optimized for contrast
export const colors = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#34495E', '#E67E22', '#8E44AD', '#27AE60'
];

export const getClassColor = (className) => {
  const index = className.charCodeAt(0) % colors.length;
  return colors[index];
};

export const getContrastColor = (backgroundColor) => {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const formatClassName = (className) => {
  // Convert Mapillary format (regulatory--stop--g1) to readable format
  return className
    .split('--')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
