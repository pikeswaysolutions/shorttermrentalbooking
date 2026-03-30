# Property Booking System - Embed Guide

This guide explains how to embed the Property Booking System widgets into your existing website or admin dashboard.

## Calendar Widget (Admin)

Use this widget in your admin dashboard to manage bookings, view the calendar, and approve/decline requests.

### Basic Embed Code

```html
<!-- Booking Calendar Widget -->
<div id="booking-calendar-widget"></div>
<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.src = window.location.origin + '/admin/calendar';
    iframe.style.width = '100%';
    iframe.style.height = '900px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.overflow = 'hidden';
    document.getElementById('booking-calendar-widget').appendChild(iframe);
  })();
</script>
```

### Features
- Monthly calendar view with all bookings
- Click bookings to view/edit/approve/decline
- Block dates directly from the calendar
- Color-coded status indicators
- Responsive design

### Customization

**Adjust Height:**
```javascript
iframe.style.height = '1000px'; // or '100vh' for full viewport
```

**Custom Border:**
```javascript
iframe.style.border = '2px solid #e5e7eb';
iframe.style.borderRadius = '12px';
```

**Add Shadow:**
```javascript
iframe.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
```

---

## Booking Widget (Customer)

Use this widget on public-facing pages where customers can submit booking requests.

### Basic Embed Code

```html
<!-- Property Booking Widget -->
<div id="property-booking-widget"></div>
<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.src = window.location.origin + '/booking';
    iframe.style.width = '100%';
    iframe.style.height = '700px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.overflow = 'hidden';
    document.getElementById('property-booking-widget').appendChild(iframe);
  })();
</script>
```

### Features
- Multi-step booking wizard
- Property selection
- Date picker with availability checking
- Add-ons selection
- Customer information form
- Rental policies agreement

### Recommended Settings

**Minimum Height:** 700px (to accommodate all wizard steps)

**Responsive Container:**
```html
<div style="max-width: 800px; margin: 0 auto;">
  <div id="property-booking-widget"></div>
  <!-- script here -->
</div>
```

---

## Advanced Configuration

### Using a Custom Domain

If hosting on a different domain, update the `iframe.src`:

```javascript
iframe.src = 'https://yourdomain.com/admin/calendar';
```

### Adding Loading State

```html
<div id="booking-calendar-widget">
  <div style="padding: 40px; text-align: center; color: #6b7280;">
    Loading calendar...
  </div>
</div>
<script>
  (function() {
    const container = document.getElementById('booking-calendar-widget');
    container.innerHTML = ''; // Clear loading message

    const iframe = document.createElement('iframe');
    iframe.src = window.location.origin + '/admin/calendar';
    iframe.style.width = '100%';
    iframe.style.height = '900px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';

    iframe.onload = function() {
      console.log('Calendar loaded successfully');
    };

    container.appendChild(iframe);
  })();
</script>
```

### Responsive Height (Auto-adjust)

```javascript
// Auto-adjust iframe height based on content
window.addEventListener('message', function(e) {
  if (e.data.type === 'resize') {
    const iframe = document.querySelector('#booking-calendar-widget iframe');
    if (iframe) {
      iframe.style.height = e.data.height + 'px';
    }
  }
});
```

---

## Example Use Cases

### WordPress Integration
Add the embed code to a custom HTML block or page template.

### React/Next.js Integration
```jsx
import { useEffect } from 'react';

export default function CalendarPage() {
  useEffect(() => {
    const container = document.getElementById('booking-calendar-widget');
    if (container && !container.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      iframe.src = window.location.origin + '/admin/calendar';
      iframe.style.width = '100%';
      iframe.style.height = '900px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      container.appendChild(iframe);
    }
  }, []);

  return <div id="booking-calendar-widget"></div>;
}
```

### Admin Dashboard Panel
```html
<div class="dashboard-widget">
  <h2>Booking Calendar</h2>
  <div id="booking-calendar-widget"></div>
  <script src="/embed-calendar.js"></script>
</div>
```

---

## Styling Tips

### Match Your Brand
```javascript
// Add custom container styling
const container = document.getElementById('booking-calendar-widget');
container.style.background = '#ffffff';
container.style.padding = '20px';
container.style.borderRadius = '12px';
container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
```

### Full-Screen Modal
```html
<button onclick="openCalendarModal()">Open Calendar</button>

<div id="calendar-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999;">
  <div style="position:relative; width:90%; height:90%; margin:5% auto; background:white; border-radius:12px; overflow:hidden;">
    <button onclick="closeCalendarModal()" style="position:absolute; top:10px; right:10px; z-index:10;">X</button>
    <div id="booking-calendar-widget-modal" style="height:100%;"></div>
  </div>
</div>

<script>
  function openCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    const container = document.getElementById('booking-calendar-widget-modal');

    if (!container.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      iframe.src = window.location.origin + '/admin/calendar';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      container.appendChild(iframe);
    }

    modal.style.display = 'block';
  }

  function closeCalendarModal() {
    document.getElementById('calendar-modal').style.display = 'none';
  }
</script>
```

---

## Quick Start

1. **Copy the embed code** for the widget you need (Calendar or Booking)
2. **Paste it** into your HTML page where you want the widget to appear
3. **Customize** the height, width, and styling as needed
4. **Test** the integration to ensure it loads correctly

For support or questions, refer to the main documentation or contact your development team.
