// Simple toast notification utility
let toastContainer = null;

export function showToast(message, type = "info") {
  // Create container if it doesn't exist
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "fixed top-20 right-5 z-50 space-y-2";
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement("div");
  const bgColor = type === "error" ? "bg-red-50 border-red-200 text-red-700" 
    : type === "success" ? "bg-green-50 border-green-200 text-green-700"
    : "bg-blue-50 border-blue-200 text-blue-700";
  
  toast.className = `glass-strong rounded-lg border px-4 py-3 shadow-lg animate-fade-in-up ${bgColor}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

