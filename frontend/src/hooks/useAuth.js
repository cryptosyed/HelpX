import { useAuthContext } from "../context/AuthContext";

// Legacy wrapper to the centralized AuthContext hook
export function useAuth() {
  return useAuthContext();
}

export { useAuthContext };

