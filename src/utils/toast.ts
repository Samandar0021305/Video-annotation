let toastContainer: HTMLDivElement | null = null;

function getOrCreateContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(
  message: string,
  type: "error" | "success" | "warning" = "error",
  duration: number = 3000
): void {
  const container = getOrCreateContainer();

  const toast = document.createElement("div");
  toast.style.cssText = `
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    opacity: 0;
    transform: translateX(100%);
    transition: opacity 0.3s ease, transform 0.3s ease;
    max-width: 400px;
    word-wrap: break-word;
  `;

  const colors = {
    error: "#dc3545",
    success: "#28a745",
    warning: "#ffc107",
  };
  toast.style.backgroundColor = colors[type];
  if (type === "warning") {
    toast.style.color = "#333";
  }

  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export function showErrorToast(message: string, duration: number = 3000): void {
  showToast(message, "error", duration);
}

export function showSuccessToast(message: string, duration: number = 3000): void {
  showToast(message, "success", duration);
}

export function showWarningToast(message: string, duration: number = 3000): void {
  showToast(message, "warning", duration);
}
