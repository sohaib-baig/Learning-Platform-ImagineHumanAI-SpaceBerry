type ToastType = "success" | "error";

function notify(type: ToastType, message: string) {
  const prefix = `[toast:${type}]`;

  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
    return;
  }

  if (type === "error") {
    console.error(prefix, message);
  } else {
    console.info(prefix, message);
  }
}

export const toast = {
  success(message: string) {
    notify("success", message);
  },
  error(message: string) {
    notify("error", message);
  },
};

