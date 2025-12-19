/**
 * JWT token utilities
 * Decodes JWT to extract user info (role, email, etc.)
 */

export function decodeJWT(token) {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (e) {
    console.warn('Failed to decode JWT:', e);
    return null;
  }
}

export function getTokenRole(token) {
  const decoded = decodeJWT(token);
  return decoded?.role || null;
}

export function getTokenEmail(token) {
  const decoded = decodeJWT(token);
  return decoded?.email || null;
}

export function getTokenUserId(token) {
  const decoded = decodeJWT(token);
  return decoded?.sub ? parseInt(decoded.sub) : null;
}

