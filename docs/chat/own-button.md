# Your own button

Hide the launcher and open the chat from a button or link of your own.

```html title="index.html"
<button id="help">Help</button>
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ launcher: false, trigger: "#help" });
</script>
```

`trigger` takes a CSS selector, an element or a list of elements. Each one opens the chat when
closed and closes it when open, and gets `aria-expanded` to match, so screen readers know.

## Open it from your code

For anything else, call the [methods](methods.md) yourself:

```js title="app.js"
document.querySelector("#pricing-question").addEventListener("click", () => {
  Helpwren.startConversation("I have a question about the Pro plan.");
});
```

`startConversation` opens a new conversation with the text in the message box. The visitor sends
it or changes it; the page cannot send it for them.

## Show an unread count on your button

```js title="app.js"
Helpwren.on("unread", (count) => {
  document.querySelector("#help-badge").textContent = count > 0 ? String(count) : "";
});
```
