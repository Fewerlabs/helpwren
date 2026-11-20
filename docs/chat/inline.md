# The chat inside your own page

Show the chat inside an element of your page instead of a floating panel.

```html title="support.html"
<div id="support" style="height: 640px"></div>
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ mode: "inline", container: "#support" });
</script>
```

This suits a Support page. The chat takes the size of the element, and never goes below 280 by 420 pixels, the smallest it
still works at. Size and shape the element however your page needs; its rounded corners carry
through. There is no launcher and no close button, because there is nothing to close into.

`container` takes an element or a CSS selector. In the default floating mode it works too: the
launcher and panel then sit inside that element instead of the page's corner, and the element
must be positioned (`position: relative` or similar).

For a page with no site around it, link to `https://support.example.com/chat`: the same chat on
a page of its own, with your brand around it.
