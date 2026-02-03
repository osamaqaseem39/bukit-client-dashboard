# 🚀 Admin Dashboard

A modern, production-ready admin dashboard built with **Next.js 16**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

- 🎨 **Modern Design System** - Consistent colors, typography, and spacing
- 🌙 **Dark Mode** - Full dark mode support with smooth transitions
- 📊 **Data Visualization** - Beautiful charts using Recharts
- 📱 **Responsive** - Mobile-first design that works on all devices
- ⚡ **Performance** - Optimized with Next.js App Router
- ♿ **Accessible** - WCAG AA compliant with keyboard navigation
- 🎭 **Animations** - Smooth micro-interactions with Framer Motion
- 🔒 **Type Safe** - Full TypeScript support

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Utilities:** clsx, tailwind-merge, zod

## 📁 Project Structure

```
admin-next/
├── app/
│   ├── dashboard/          # Dashboard pages
│   │   ├── analytics/      # Analytics page
│   │   ├── bookings/       # Bookings management
│   │   ├── gaming/         # Gaming facilities
│   │   ├── locations/      # Location management
│   │   ├── settings/       # Settings page
│   │   ├── users/          # User management
│   │   ├── layout.tsx      # Dashboard layout wrapper
│   │   └── page.tsx        # Main dashboard page
│   ├── globals.css         # Global styles & design tokens
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (redirects to dashboard)
├── components/
│   ├── ui/                 # Core UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   └── StatCard.tsx
│   ├── charts/             # Chart components
│   │   ├── BarChart.tsx
│   │   ├── LineChart.tsx
│   │   └── PieChart.tsx
│   └── layout/             # Layout components
│       ├── DashboardLayout.tsx
│       ├── Sidebar.tsx
│       └── Topbar.tsx
├── hooks/
│   └── use-theme.ts        # Dark mode hook
└── lib/
    └── utils.ts            # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🎨 Design System

### Colors

The dashboard uses semantic color tokens defined in CSS variables:

- **Primary:** Indigo (`rgb(99, 102, 241)`)
- **Success:** Green (`rgb(34, 197, 94)`)
- **Warning:** Amber (`rgb(245, 158, 11)`)
- **Error:** Red (`rgb(239, 68, 68)`)

All colors automatically adapt to light/dark mode.

### Typography

- **Font:** Inter (Google Fonts)
- **Scale:** Consistent text sizes using Tailwind's type scale
- **Weights:** 300, 400, 500, 600, 700

### Spacing

Uses Tailwind's spacing scale for consistent rhythm throughout the UI.

## 📱 Pages

- **Dashboard** (`/dashboard`) - Overview with stats and charts
- **Gaming** (`/dashboard/gaming`) - Manage gaming facilities
- **Locations** (`/dashboard/locations`) - Manage business locations
- **Users** (`/dashboard/users`) - User management
- **Bookings** (`/dashboard/bookings`) - Booking management
- **Analytics** (`/dashboard/analytics`) - Detailed analytics and reports
- **Settings** (`/dashboard/settings`) - Application settings

## 🎯 Key Components

### Button

```tsx
import Button from "@/components/ui/Button";

<Button variant="primary" size="md" isLoading={false}>
  Click Me
</Button>
```

Variants: `primary`, `secondary`, `ghost`, `destructive`
Sizes: `sm`, `md`, `lg`

### Card

```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Input

```tsx
import Input from "@/components/ui/Input";

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error="Invalid email"
/>
```

## 🌙 Dark Mode

Dark mode is implemented using CSS variables and persists in localStorage. Toggle it using the theme switcher in the topbar.

## 📊 Charts

Charts are built with Recharts and automatically adapt to the current theme:

```tsx
import LineChart from "@/components/charts/LineChart";

<LineChart
  data={data}
  dataKey="month"
  lines={[
    { key: "revenue", name: "Revenue", color: "rgb(var(--primary))" }
  ]}
/>
```

## 🔧 Customization

### Adding New Colors

Edit `app/globals.css` to add new color tokens:

```css
:root {
  --your-color: 255 0 0;
}

.dark {
  --your-color: 200 0 0;
}
```

### Adding New Pages

1. Create a new file in `app/dashboard/your-page/page.tsx`
2. Add navigation item in `components/layout/Sidebar.tsx`
3. Use the `DashboardLayout` wrapper (already applied via `app/dashboard/layout.tsx`)

## 📝 Best Practices

- ✅ Use semantic HTML
- ✅ Follow the design system tokens
- ✅ Keep components small and focused
- ✅ Use TypeScript for type safety
- ✅ Test responsive behavior
- ✅ Ensure accessibility (keyboard nav, ARIA labels)

## 🚧 Future Enhancements

- [ ] Authentication system
- [ ] API integration
- [ ] Real-time updates
- [ ] Advanced filtering and search
- [ ] Export functionality (PDF, CSV)
- [ ] More chart types
- [ ] Internationalization (i18n)

## 📄 License

MIT

## 🙏 Credits

Built following modern dashboard design principles with focus on:
- Design consistency
- User experience
- Performance
- Accessibility
- Scalability
