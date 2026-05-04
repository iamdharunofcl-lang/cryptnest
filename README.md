# 🪺 CryptNest v6

**Enterprise-grade secure cloud storage platform** with end-to-end encryption, advanced access control, and comprehensive audit trails.

> A safe nest for every file — built for organizations that take security seriously.

---

## 🌟 Key Features

### 🔐 **Advanced Security**
- **AES-256-GCM encryption** — Military-grade encryption at rest and in transit
- **Zero-knowledge architecture** — Files encrypted before transmission
- **Suspicious login detection** — IP monitoring and anomaly alerts
- **File DNA tracking** — Immutable custody chain & download forensics
- **Optional virus scanning** — VirusTotal integration (free 500/day)

### 👥 **Enterprise Access Control**
- **5-tier role system** — SuperAdmin, Admin, Manager, Member, Viewer
- **Department-based permissions** — Granular file access management
- **Google SSO** — Optional seamless authentication
- **Multi-factor authentication** — OTP verification support
- **Session control** — JWT-based, 7-day max age

### 📊 **Compliance & Auditing**
- **Complete audit logs** — Every action tracked with IP, user agent, timestamp
- **Exportable reports** — CSV/PDF audit trail exports
- **Data retention policies** — Configurable deletion schedules
- **GDPR/SOC2/ISO27001 ready** — Enterprise compliance standards

### 📁 **File Management**
- **Unlimited file storage** — Via Supabase integration
- **Folder hierarchy** — Nested folder structure
- **File sharing** — Secure share links with token-based access
- **Recycle bin** — 30-day recovery window (configurable)
- **Full-text search** — MongoDB text indexing
- **Bulk operations** — Move, rename, delete (coming soon)

### 💼 **Team Collaboration**
- **Shared workspaces** — Department-level organization
- **File sharing** — Share with individual users or departments
- **Activity tracking** — See who accessed what and when
- **Starred files** — Quick access to frequently used files

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **MongoDB Atlas** account (free tier works)
- **Supabase** account (free tier works)
- **.env.local** file with configuration

### Installation

```bash
# 1. Clone and install dependencies
git clone https://github.com/iamdharunofcl-lang/cryptnest.git
cd cryptnest
npm install

# 2. Create .env.local (see Configuration section below)
cp .env.example .env.local

# 3. Seed database with demo data
npm run seed

# 4. Start development server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📋 Login Credentials (Demo)

| Role | Email | Password |
|---|---|---|
| **Super Admin** | admin@cryptnest.com | Admin@2026 |
| **Manager** | alex@cryptnest.com | Member@2026 |
| **HR Admin** | priya@cryptnest.com | Member@2026 |
| **Member** | james@cryptnest.com | Member@2026 |

> ⚠️ **Security Note:** Change all demo credentials in production. Use strong passwords with mixed case, numbers, and symbols.

---

## ⚙️ Configuration

### Required Environment Variables

Create `.env.local` in the project root:

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cryptnest

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars-here

# File Storage
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx

# Email (Optional - Resend.com)
RESEND_API_KEY=re_xxxxxxxx

# OAuth (Optional - Google)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx

# Virus Scanning (Optional - VirusTotal)
VIRUSTOTAL_API_KEY=xxxxxxxx
```

### Optional Features

#### 📧 **Email Notifications** (Resend)
1. Sign up at [resend.com](https://resend.com)
2. Create API key (free: 3000 emails/month)
3. Add `RESEND_API_KEY` to `.env.local`
4. Features unlocked:
   - Suspicious login alerts
   - Password reset emails
   - Share notifications

#### 🔐 **Google Single Sign-On**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```
5. Users can now "Continue with Google" on login

#### 🦠 **Virus Scanning** (VirusTotal)
1. Sign up at [virustotal.com](https://virustotal.com)
2. Get API key (free: 500 scans/day)
3. Add `VIRUSTOTAL_API_KEY` to `.env.local`
4. All uploads automatically scanned for malware

---

## 📁 Project Structure

```
cryptnest/
│
├── 📝 Configuration Files
│   ├── package.json              ← npm scripts & dependencies
│   ├── next.config.js            ← Next.js configuration
│   ├── tailwind.config.js         ← Tailwind CSS config
│   ├── jsconfig.json             ← JavaScript path aliases
│   └── postcss.config.js         ← PostCSS plugins
│
├── 🔐 Core Libraries
│   ├── lib/
│   │   ├── auth.js               ← NextAuth configuration & login logic
│   │   ├── mongodb.js            ← MongoDB connection pool
│   │   ├── supabase.js           ← Supabase storage client
│   │   ├── encryption.js         ← AES-256-GCM encryption/decryption
│   │   └── email.js              ← Email templates & sending
│   │
│   └── models/
│       ├── User.js               ← User schema (roles, departments)
│       ├── File.js               ← File schema (DNA records, custody)
│       ├── Department.js         ← Department/team organization
│       ├── AuditLog.js           ← Audit trail logging
│       └── ShareLink.js          ← Public share link tokens
│
├── 🎨 UI Components
│   ├── components/
│   │   ├── Sidebar.jsx           ← Left navigation
│   │   ├── TopBar.jsx            ← Top header & user menu
│   │   └── Providers.jsx         ← NextAuth & Tailwind providers
│   │
│   └── app/
│       ├── layout.jsx            ← Root layout wrapper
│       ├── globals.css           ← Global styles
│       ├── page.jsx              ← Root redirect (/ → /dashboard or /login)
│       │
│       ├── 🔓 Public Routes
│       │   ├── login/page.jsx              ← Email/password & Google SSO
│       │   ├── forgot-password/page.jsx    ← Password reset request
│       │   ├── reset-password/page.jsx     ← Reset token verification
│       │   ├── request-access/page.jsx     ← User signup form
│       │   ├── verify-otp/page.jsx         ← MFA/OTP verification
│       │   └── share/[token]/page.jsx      ← Public file download link
│       │
│       ├── 🔐 Protected Routes
│       │   ├── dashboard/page.jsx          ← Home/dashboard overview
│       │   ├── files/page.jsx              ← File browser & explorer
│       │   ├── starred/page.jsx            ← Starred files view
│       │   └── recycle/page.jsx            ← Deleted files recovery
│       │
│       ├── 👨‍💼 Admin Routes
│       │   ├── admin/page.jsx              ← Admin dashboard
│       │   └── audit/page.jsx              ← Audit log viewer & export
│       │
│       └── 🔌 API Routes
│           ├── auth/
│           │   ├── [...nextauth]/route.js  ← NextAuth handler
│           │   ├── forgot-password/route.js
│           │   ├── reset-password/route.js
│           │   ├── verify-otp/route.js
│           │   └── request-access/route.js
│           │
│           ├── files/
│           │   ├── list/route.js           ← List files (paginated)
│           │   ├── upload/route.js         ← Upload & encrypt files
│           │   ├── download/route.js       ← Download & decrypt files
│           │   ├── delete/route.js         ← Soft delete (move to bin)
│           │   ├── rename/route.js         ← Rename file
│           │   ├── move/route.js           ← Move between folders
│           │   ├── folder/route.js         ← Create folder
│           │   ├── restore/route.js        ← Restore from bin
│           │   ├── permanent-delete/route.js ← Permanent deletion
│           │   ├── empty-bin/route.js      ← Clear entire bin
│           │   ├── preview/route.js        ← Generate thumbnails
│           │   ├── star/route.js           ← Toggle star/favorite
│           │   └── scan/route.js           ← Virus scan file
│           │
│           ├── share/
│           │   ├── route.js                ← Create share links
│           │   ├── access/route.js         ← Access share link
│           │   └── revoke/route.js         ← Revoke/delete link
│           │
│           ├── users/route.js              ← List/manage users
│           ├── departments/route.js        ← List/manage departments
│           ├── analytics/route.js          ← Dashboard metrics
│           │
│           ├── audit/
│           │   ├── route.js                ← Get audit logs
│           │   └── export/route.js         ← Export logs (CSV/PDF)
│           │
│           └── admin/
│               ├── ip-whitelist/route.js   ← IP whitelist management
│               └── retention/route.js      ← Deletion retention policy
│
├── 🚀 Scripts
│   └── scripts/
│       └── seed.cjs              ← Database seeding script
│
└── 📚 Documentation
    └── README.md                 ← This file
```

---

## 🔄 Available Routes

### Public Routes (No Login Required)

| Route | Purpose | Type |
|-------|---------|------|
| `/` | Auto-redirect | Page |
| `/login` | Email/password login | Page |
| `/forgot-password` | Password reset request | Page |
| `/reset-password` | Verify & reset password | Page |
| `/request-access` | User registration | Page |
| `/verify-otp` | MFA verification | Page |
| `/share/[token]` | Public file download | Page |

### Protected Routes (Login Required)

| Route | Purpose | Type | Access |
|-------|---------|------|--------|
| `/dashboard` | Home dashboard | Page | All users |
| `/files` | File browser/explorer | Page | All users |
| `/starred` | Favorite files | Page | All users |
| `/recycle` | Deleted files | Page | All users |

### Admin Routes (Admin+ Required)

| Route | Purpose | Type | Access |
|-------|---------|------|--------|
| `/admin` | Admin panel | Page | Admin+ |
| `/audit` | Audit logs | Page | Admin+ |

---

## 🛠 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 14.2.35 |
| **UI Framework** | React | 18.x |
| **Styling** | Tailwind CSS | 3.3.0 |
| **Database** | MongoDB Atlas | — |
| **ORM** | Mongoose | 8.3.4 |
| **Authentication** | NextAuth | 4.24.7 |
| **Storage** | Supabase Storage | 2.43.4 |
| **Encryption** | Node.js Crypto | AES-256-GCM |
| **Password Hashing** | bcryptjs | 2.4.3 |
| **Email** | Resend | (optional) |
| **Linting** | ESLint | 8.x |

---

## 📦 npm Scripts

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)

# Production
npm run build        # Build optimized production bundle
npm start            # Start production server

# Database
npm run seed         # Populate demo data (requires .env.local)
```

---

## 🔐 Encryption Details

### AES-256-GCM Algorithm

CryptNest uses **AES-256-GCM** for all file encryption:

```javascript
// Encryption flow:
1. Generate random IV (16 bytes)
2. Create cipher with AES-256-GCM
3. Encrypt file buffer
4. Get authentication tag
5. Combine: [IV(16)] + [AuthTag(16)] + [EncryptedData]
6. Upload to Supabase Storage

// Decryption flow:
1. Extract IV (first 16 bytes)
2. Extract AuthTag (next 16 bytes)
3. Extract encrypted data (remainder)
4. Create decipher with AES-256-GCM
5. Set authentication tag
6. Decrypt and verify
7. Return decrypted buffer
```

**Key derivation:**
```javascript
const key = crypto.scryptSync(NEXTAUTH_SECRET, 'cryptnest-salt-v1', 32)
// Produces 32 bytes (256 bits) for AES-256
```

---

## 🔐 User Roles & Permissions

| Role | Abilities |
|------|-----------|
| **Super Admin** | Full system access, user/dept management, audit logs, IP whitelist, retention policy |
| **Admin** | File management, audit logs, user management (limited), IP whitelist |
| **Manager** | File management, user list view, audit logs (dept only) |
| **Member** | Upload/download files, share files, view starred |
| **Viewer** | Download/preview only, no upload/delete |

---

## 🛡️ Security Features

### Login & Authentication
- ✅ Credentials provider (email + password)
- ✅ Google OAuth integration
- ✅ Bcryptjs password hashing
- ✅ Suspicious login detection
- ✅ IP-based anomaly detection
- ✅ Failed login throttling

### File Security
- ✅ AES-256-GCM encryption
- ✅ Encrypted upload/download
- ✅ Optional virus scanning
- ✅ File DNA tracking
- ✅ Custody chain verification
- ✅ Access audit logging

### Network Security
- ✅ HTTPS enforced (production)
- ✅ CORS configured
- ✅ IP whitelist (admin)
- ✅ Rate limiting (recommended)

### Compliance
- ✅ GDPR-ready (data export/deletion)
- ✅ SOC 2 audit trails
- ✅ ISO 27001 audit logging
- ✅ Data retention policies

---

## 🐛 Troubleshooting

### "Invalid credentials" on login
- Check email/password in `.env.local` seed data
- Verify MongoDB connection: `MONGODB_URI`
- Run `npm run seed` to reset demo accounts

### Files not uploading
- Check Supabase credentials: `SUPABASE_URL` and `SUPABASE_KEY`
- Verify Supabase bucket exists: `cryptnest-uploads`
- Check file size limits in next.config.js

### "Can't connect to MongoDB"
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas (allow 0.0.0.0)
- Ensure `.env.local` is loaded (restart dev server)

### Google SSO not working
- Verify redirect URI: `http://localhost:3000/api/auth/callback/google` (production: use HTTPS)
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
- Ensure both values are non-empty (can be disabled by omitting)

### Emails not sending
- Verify `RESEND_API_KEY` is provided
- Check Resend account has API key generated
- Ensure sender email is verified in Resend dashboard

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect repo to Vercel
# https://vercel.com/import

# 3. Set environment variables in Vercel settings
# Copy all variables from .env.local

# 4. Deploy
# Automatic on git push
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t cryptnest .
docker run -p 3000:3000 --env-file .env.local cryptnest
```

---

## 📞 Support

### Issues & Bugs
- **GitHub Issues:** [Report a bug](https://github.com/iamdharunofcl-lang/cryptnest/issues)
- **Discussions:** [Ask a question](https://github.com/iamdharunofcl-lang/cryptnest/discussions)

### Documentation
- 📖 [Next.js Docs](https://nextjs.org/docs)
- 📖 [MongoDB Docs](https://docs.mongodb.com)
- 📖 [Supabase Docs](https://supabase.com/docs)
- 📖 [NextAuth Docs](https://next-auth.js.org)

---

## 📄 License

MIT © 2026 CryptNest by [iamdharunofcl-lang](https://github.com/iamdharunofcl-lang)

---

## 🙏 Credits

- **Framework:** Next.js 14
- **Database:** MongoDB & Mongoose
- **Storage:** Supabase
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS
- **Encryption:** Node.js Crypto (OpenSSL)

---

## 📊 Stats

- **Total API Routes:** 20+
- **Database Models:** 5
- **User Roles:** 5
- **Encryption Algorithm:** AES-256-GCM
- **Audit Trail:** Complete
- **Language Composition:** 98.6% JavaScript, 1.4% CSS

**Built with ❤️ for enterprise security**
