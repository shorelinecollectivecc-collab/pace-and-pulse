export async function registerPacePulseServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
  } catch {
    return null;
  }
}

export async function showPacePulseNotification(
  title: string,
  options: NotificationOptions
) {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  const registration = await navigator.serviceWorker?.ready;

  if (registration) {
    await registration.showNotification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      ...options,
    });
    return true;
  }

  new Notification(title, options);
  return true;
}
