// Open At Reply: when you open an unread thread, bb shows the start of the
// latest agent reply instead of the end of it.
import { useEffect } from "react";
import { definePluginApp, useBbContext } from "@get-bb/plugin-sdk/app";
import { jumpToReplyOnUnreadOpen } from "./src/jump";

function OpenAtReply() {
  const { threadId } = useBbContext();
  useEffect(() => {
    if (!threadId) return;
    return jumpToReplyOnUnreadOpen(threadId);
  }, [threadId]);
  return null;
}

export default definePluginApp((app) => {
  app.slots.experimental_appOverlay({
    id: "open-at-reply",
    component: OpenAtReply,
  });
});
