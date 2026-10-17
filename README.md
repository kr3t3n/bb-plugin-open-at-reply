# Open At Reply

When you open an unread thread, bb shows the start of the latest agent reply. You read it from the top and do not scroll up.

## How it works

bb marks unread content with a "New" divider and scrolls to it once. bb measures the page before long replies and UI cards finish their layout. When the divider seems to sit on the last screen, bb pins the view to the bottom, and the view then follows the content to the end.

This plugin waits for the divider when a thread opens. It then holds the first row of the latest reply at the top of the viewport for three seconds while the layout settles. If the divider sits below the reply start, the plugin uses the divider. A short reply that fits on one screen stays at the bottom, because all of it is visible.

Any wheel, touch, click or key press stops the plugin at once. Threads that are already read open as before.

## Limits

The plugin reads bb's timeline DOM (`data-page-scroll-viewport`, `data-timeline-row-id`, `thread-unread-divider`). A bb update that renames these attributes stops the plugin, and bb then keeps its default behaviour.

## Develop

```sh
npm install
npm test          # unit tests for the row picker
npm run typecheck
bb plugin build . && bb plugin reload open-at-reply
```
