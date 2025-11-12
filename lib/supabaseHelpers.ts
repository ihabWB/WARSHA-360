// Helper functions to convert between camelCase and snake_case for Supabase

/**
 * Convert camelCase keys to snake_case for Supabase insert/update
 */
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  const snakeObj: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeObj[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  
  return snakeObj;
}

/**
 * Convert snake_case keys to camelCase from Supabase response
 */
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const camelObj: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelObj[camelKey] = toCamelCase(obj[key]);
    }
  }
  
  return camelObj;
}
