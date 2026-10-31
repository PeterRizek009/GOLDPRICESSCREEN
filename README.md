# GoldVision

**Real-Time Gold & Silver Price Display SaaS Platform**

GoldVision is a multi-tenant SaaS platform designed for gold retailers, jewelry shops, and precious metals businesses to display market prices and automatically calculate product prices using customizable premiums and discounts.

The platform provides centralized market pricing, company-specific product management, and digital signage screens optimized for retail displays.

> **Project Status:** Active Development  
> **Technology Stack:** React, Vite, Tailwind CSS, Supabase, JavaScript, TypeScript, Node.js

---

## Overview

GoldVision allows multiple retail businesses to share a centralized gold and silver market data feed while maintaining independent product catalogs and pricing configurations.

Each company can manage its products, configure pricing adjustments, and display prices on dedicated screens.

**Main objectives:**
- Centralize gold and silver market prices.
- Reduce duplicate requests to external market data providers.
- Automate product pricing calculations.
- Support multiple companies with independent product configurations.
- Provide professional digital signage for retail environments.
- Simplify price management for gold and jewelry retailers.

## Key Features

### Gold & Silver Market Prices

- Gold spot prices (XAU/USD).
- Silver spot prices (XAG/USD).
- Conversion from USD per troy ounce to AED per gram.
- Calculated gold rates for 24K, 22K, 21K, and 18K.
- Centralized market price storage in Supabase.
- Market data timestamps and delayed price indicators.
- Architecture designed for future WebSocket streaming integration.

### Automated Product Pricing

Each company can manage its own product catalog, including:

- Product name and image.
- Weight and measurement unit (GM, OZ, KG).
- Gold or silver products.
- Premium or discount adjustments.
- Per-gram or fixed adjustment amounts.
- Automatic price recalculation when market prices change.

**Product pricing formula:**

```text
Base Price = Metal Price per Gram × Product Weight in Grams

Final Price = Base Price ± Pricing Adjustment
```

For per-gram adjustments:

```text
Pricing Adjustment = Adjustment per Gram × Product Weight in Grams
```

### Multi-Tenant Company Management

GoldVision is designed to support multiple independent businesses.

**Platform Administrator:**
- Manage registered companies.
- Review company accounts.
- Manage account activation status.
- Monitor the platform.

**Company Administrator:**
- Manage company products.
- Configure premiums and discounts.
- Upload product images.
- Access company-specific display screens.

### Digital Signage

GoldVision includes a retail-oriented display interface featuring:

- Gold and silver spot prices.
- Company branding and name.
- Product images and calculated prices.
- Gold karat rates in AED.
- Market data update information.
- Responsive layouts suitable for large screens and televisions.

Public display routes are intended to support unattended retail screens without requiring customers to sign in.

## System Architecture

```text
External Market Data Provider
             |
             v
Supabase Edge Function
             |
             v
Supabase Market Quotes
             |
             v
GoldVision React Application
             |
             v
Company Digital Signage
             |
             v
Company-Specific Premiums & Product Prices
```

Market prices are shared centrally, while each company maintains its own pricing adjustments.

### Market Data Provider

The current development integration uses **goldprice.dev REST API**.

The architecture is designed to support WebSocket-based market data streaming in a future production release.

**Important:** Free-tier market data may be delayed. Live streaming availability, commercial use, and redistribution rights depend on the market data provider's subscription and licensing terms.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Backend Functions | Supabase Edge Functions (Deno / TypeScript) |
| Market Data | goldprice.dev |
| JavaScript Runtime | Node.js |
| Version Control | Git & GitHub |

## Project Structure

```text
gold-display-app/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── lib/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   ├── functions/
│   │   └── update-market-prices/
│   │       └── index.ts
│   └── config.toml
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

*The structure above represents the intended project organization. Some files may vary as development and cleanup continue.*

## Local Development

### Prerequisites

- Node.js and npm
- Git
- Supabase project
- Supabase CLI for Edge Function deployment

### Installation

Clone the repository:

```bash
git clone https://github.com/PeterRizek009/GoldVision.git
cd GoldVision
```

Install dependencies:

```bash
npm install
```

Create a local `.env` file containing the frontend Supabase configuration:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_USD_AED_RATE=3.6725
```

Use the environment variable names expected by the application's Supabase client configuration.

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Market Price Calculations

GoldVision uses troy-ounce market prices and converts them into AED per gram.

```text
1 Troy Ounce = 31.1034768 Grams

Gold Price AED/Gram =
Gold Spot USD/OZ ÷ 31.1034768 × USD/AED Rate
```

Gold karat calculations:

```text
24K = Gold Price per Gram

22K = 24K × (22 / 24)

21K = 24K × (21 / 24)

18K = 24K × (18 / 24)
```

These are theoretical metal-content calculations. Actual retail prices may also include premiums, making charges, fees, and applicable taxes.

## Database

Main application tables include:

**profiles**

Stores user and company information, including company names, roles, and activation status.

**company_products**

Stores company-specific products, weights, images, pricing adjustments, and active status.

**market_quotes**

Stores centralized market prices, including metal type, spot price, AED gram rate, data source, and timestamp.

Database access should be controlled using Supabase Row Level Security (RLS) policies.

## Authentication & Security

GoldVision uses Supabase Authentication for platform and company administrator access.

Security priorities include:

- Role-based access control.
- Tenant isolation using Row Level Security.
- Secure backend-based user provisioning.
- Read-only public display access.
- Server-side storage of sensitive API keys.
- Restricted market price update operations.
- Protection against unauthorized modification of company products.
- Secure handling of environment variables.

**Security Notice:** Security improvements and auditing are ongoing. Production deployment should not proceed until authentication, public data access, tenant isolation, and secret management have been reviewed and tested.

Never commit `.env` files, service-role keys, API secrets, or authentication credentials to GitHub.

## Development Roadmap

- [x] React application setup.
- [x] Supabase integration.
- [x] Company dashboard and product management.
- [x] Automated product pricing.
- [x] Gold and silver market price integration.
- [x] Centralized market price database.
- [x] Digital signage interface.
- [ ] Complete code cleanup and security audit.
- [ ] Improve authentication and user onboarding.
- [ ] Implement production-ready WebSocket streaming.
- [ ] Implement reliable real-time price broadcasting.
- [ ] Add market status and data freshness monitoring.
- [ ] Add subscription and billing management.
- [ ] Complete production testing and deployment.
- [ ] Launch commercial SaaS service.

## Intended Users

GoldVision is designed for:

- Gold and jewelry retailers.
- Gold bullion and coin dealers.
- Precious metals trading businesses.
- Retail stores requiring automated price displays.
- Multi-location jewelry and precious metals businesses.

## Disclaimer

GoldVision is under active development.

Market prices are provided by third-party services and may be delayed, unavailable, or subject to licensing restrictions. Displayed product prices are calculated estimates and do not constitute binding trade quotations.

## License

**Proprietary — All Rights Reserved**

The source code is maintained for private development. No permission to copy, redistribute, sublicense, or commercially use the source code is granted without the owner's authorization.

---

**GoldVision — Smarter Precious Metals Pricing & Digital Signage.**
