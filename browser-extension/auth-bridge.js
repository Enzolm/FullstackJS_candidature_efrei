chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "get-site-session") return false;

  sendResponse({
    token: localStorage.getItem("token") || sessionStorage.getItem("token"),
    user:
      localStorage.getItem("auth-user") ||
      sessionStorage.getItem("auth-user"),
  });
  return false;
});
