# SEO Genie Frontend

Next.js frontend for SEO Genie - a magical SEO application for jewelry stores.

## Technologies

- **Next.js 14** - React Framework
- **TypeScript** - Static typing
- **Tailwind CSS** - Styling
- **NextAuth.js** - Authentication (Google OAuth + Credentials)
- **Prisma** - Database ORM
- **PostgreSQL** - Database

## Features

### Authentication
- Google OAuth login
- Admin login with email/password
- New user approval system

### User Roles
- **Admin**: Full system access, including API settings
- **Manager**: Manages users and prompts, but no API settings access
- **Seller**: Access only to SEO features

### Admin Dashboard
- User management (approve, block, change role)
- Pending access requests
- AI prompt editing
- AI settings (provider, model, temperature)

### SEO Features
- **High Authority Page**: Generates blueprints for high authority pages
- **Collection Page**: Optimization for Shopify collection pages
- **Product Page**: Optimization for Shopify product pages

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/seogenie?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Backend API URL (optional)
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Create an "OAuth 2.0 Client ID"
5. Configure redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to `.env`

### 4. Configure database

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev

# Create initial data (admin)
npm run db:seed
```

### 5. Run in development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Initial Credentials

After running seed, you will have an admin user:

- **Email**: admin@seogenie.com
- **Password**: admin123

⚠️ **Important**: Change the password after first login!

## Deploy to Vercel

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Configure PostgreSQL (recommended: Vercel Postgres or Supabase)
4. Deploy!

## Project Structure

```
frontend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Initial data
├── public/
│   └── images/            # Images and icons
├── src/
│   ├── app/
│   │   ├── admin/         # Admin pages
│   │   ├── api/           # API routes
│   │   ├── login/         # Login page
│   │   ├── [serviceSlug]/ # Dynamic service pages
│   │   └── ...
│   ├── components/        # Reusable components
│   ├── lib/               # Utilities and configurations
│   └── types/             # Type definitions
└── ...
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Check lint errors
- `npm run db:push` - Sync schema with database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Populate initial data
- `npm run db:studio` - Open Prisma Studio

## License

Property of Smart Age Solutions.
