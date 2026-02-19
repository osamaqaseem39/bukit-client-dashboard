# 🚀 Quick Start Guide

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure Overview

```
client-dashboard/
├── app/
│   └── dashboard/          # All dashboard pages
│       ├── page.tsx        # Main dashboard (overview)
│       ├── gaming/         # Gaming facilities management
│       ├── locations/      # Location management
│       ├── users/          # User management
│       ├── bookings/       # Booking management
│       ├── analytics/      # Analytics & reports
│       └── settings/       # Settings page
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── charts/             # Chart components
│   └── layout/             # Layout components
└── lib/                    # Utility functions
```

## Key Features

✅ **Dark Mode** - Toggle in the topbar
✅ **Responsive** - Works on mobile, tablet, and desktop
✅ **Charts** - Interactive data visualization
✅ **Tables** - Sortable, filterable data tables
✅ **Modals** - For forms and confirmations
✅ **Animations** - Smooth transitions throughout

## Customization

### Colors
Edit `app/globals.css` to change the color scheme:
```css
:root {
  --primary: 99 102 241;  /* Change primary color */
}
```

### Adding a New Page

1. Create `app/dashboard/your-page/page.tsx`
2. Add navigation item in `components/layout/Sidebar.tsx`:
```tsx
{ label: "Your Page", href: "/dashboard/your-page", icon: <YourIcon /> }
```

### Using Components

```tsx
import { Button, Card, CardHeader, CardContent } from "@/components/ui";
import Input from "@/components/ui/Input";

<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardContent>
    <Input label="Name" />
    <Button>Submit</Button>
  </CardContent>
</Card>
```

## Next Steps

- Connect to your backend API
- Add authentication
- Customize colors and branding
- Add more pages as needed
- Integrate real data

## Need Help?

Check the main [README.md](./README.md) for detailed documentation.
