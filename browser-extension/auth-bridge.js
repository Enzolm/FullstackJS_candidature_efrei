chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "get-site-session") return false;

  sendResponse({
    token: localStorage.getItem("token"),
    user: localStorage.getItem("auth-user"),
  });
  return false;
});
