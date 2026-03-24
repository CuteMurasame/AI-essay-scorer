# AI English Scorer 🎓

A modern, AI-powered essay scoring and feedback platform built with Next.js. This application allows teachers and students to submit essays for automated grading using various AI models, with real-time streaming feedback and comprehensive management capabilities.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.2-2D3748?logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Core Functionality
- **Multi-step Essay Submission** - Intuitive two-step process for uploading content and selecting grading criteria
- **Real-time AI Feedback** - Streaming responses with live markdown rendering
- **Flexible Content Input** - Support for both text input and image uploads (OCR-ready)
- **Multiple AI Models** - Configure and switch between different AI providers (OpenAI, Claude, etc.)
- **Custom Grading Standards** - Define your own rubrics with customizable scoring criteria
- **Credit System** - Built-in point system for usage management

### 👨‍💼 Admin Panel
- **Dynamic AI Configuration** - Add, edit, or remove AI model configurations on the fly
- **Grading Standards Management** - Create custom evaluation criteria with prompts
- **User Management** - View users, manage credits, bulk recharge operations
- **Submission Monitoring** - Track all essay submissions and their statuses
- **API Key Management** - Easily apply credentials across multiple configurations

### 🎨 Modern UI/UX
- **Responsive Design** - Optimized for mobile, tablet, and desktop
- **Clean Interface** - Gray-toned design with strategic color accents
- **Real-time Updates** - EventSource streaming for live feedback
- **Status Indicators** - Clear visual feedback for task progress
- **Memory Efficient** - Chunked markdown rendering keeps memory usage under 1GB

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-english-scorer
```

2. **Install dependencies**
```bash
npm install
```

3. **Initialize database**
```bash
# Create database schema
npx prisma db push

# Seed initial data (admin user, sample configs)
npx tsx prisma/seed.ts
```

4. **Start development server**
```bash
npm run dev
```

5. **Access the application**
   - Open http://localhost:3000
   - Login with default credentials:
     - **Admin**: `admin` / `admin123` (10000 credits)
     - **Test User**: `test` / `test123` (500 credits)

### ⚙️ Initial Configuration

**Important:** Before submitting essays, configure AI models:

1. Login as admin
2. Navigate to "Admin" → "AI Config" tab
3. Update the **BASE** configuration with your API credentials (required for content safety checks)
4. Add or update other AI model configurations as needed

Example configuration:
```
Name: GPT4
Display Name: GPT-4 Turbo
Endpoint: https://api.openai.com/v1
API Key: sk-xxxxxxxxxxxxxxxx
Model: gpt-4-turbo-preview
Credit Cost: 50
```

## 📖 Usage Guide

### For Students/Teachers

**1. Submit an Essay**
- Go to "Dashboard"
- **Step 1**: Upload topic and essay (text or images)
- **Step 2**: Select grading standard and AI model
- Click "Create Task"

**2. View Results**
- Automatically redirected to task detail page
- See real-time processing status and waiting time
- View detailed feedback with scores when complete

**3. Browse History**
- Access "History" page to see all submissions
- Click any card to view detailed feedback

### For Administrators

**1. Manage AI Configurations**
- Add/edit/delete AI model configurations
- Set credit cost per model
- Use "Apply to Others" to copy API credentials across configs
- **Note:** BASE config cannot be deleted (used for safety checks)

**2. Manage Grading Standards**
- Create custom evaluation rubrics
- Set default full score
- Add AI-specific prompts for better evaluation

**3. User Management**
- View all users and their credit balances
- Single or bulk credit recharge
- Support negative values for credit deduction

**4. Monitor Submissions**
- View all submissions across all users
- Track task statuses and errors

## 🏗️ Project Structure

```
ai-english-scorer/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/               # Admin panel
│   │   │   └── page.tsx         # Dynamic config management
│   │   ├── dashboard/           # Essay submission
│   │   │   └── page.tsx         # Multi-step submission UI
│   │   ├── history/             # Submission history
│   │   │   ├── page.tsx         # History list
│   │   │   └── [id]/page.tsx    # Detail with streaming
│   │   ├── login/               # Authentication
│   │   ├── api/                 # API routes
│   │   │   ├── auth/            # Login, register, logout
│   │   │   ├── user/            # User profile
│   │   │   ├── essay/           # Submit, history, stream
│   │   │   └── admin/           # Admin operations
│   │   ├── layout.tsx           # Root layout with navbar
│   │   └── globals.css          # Global styles
│   └── lib/                     # Utilities
│       ├── db.ts                # Prisma client
│       ├── auth.ts              # JWT authentication
│       ├── ai.ts                # AI model integration
│       └── streamStore.ts       # Streaming feedback store
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Initial data seeder
├── package.json
└── package-lock.json
```

## 🗄️ Database Schema

```prisma
model User {
  id              String       @id @default(cuid())
  username        String       @unique
  password        String       # bcrypt hashed
  role            String       @default("USER")
  credits         Int          @default(200)
  lastCreditReset DateTime     @default(now())
  submissions     Submission[]
  createdAt       DateTime     @default(now())
}

model AIConfig {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  apiKey      String
  endpoint    String
  model       String
  creditCost  Int      @default(0)
  sortOrder   Int      @default(0)
}

model CategoryConfig {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  defaultFull Int      @default(100)
  extraPrompt String   @default("")
}

model Submission {
  id             String   @id @default(cuid())
  userId         String
  title          String?
  summary        String?
  content        String?
  topicImageUrls String   @default("[]")
  imageUrls      String   @default("[]")
  standard       String
  level          String   # AI config ID
  language       String   @default("中文")
  fullScore      Int      @default(100)
  creditCost     Int      @default(0)
  responseTime   Int?
  score          Float?
  feedback       String?
  status         String   @default("PENDING")
  error          String?
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
}
```

## 🔌 API Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### User
- `GET /api/user/profile` - Get user profile and credits

### Essays
- `POST /api/essay/submit` - Submit essay for grading
- `GET /api/essay/history` - Get user's submission history
- `GET /api/essay/[id]` - Get submission details
- `GET /api/essay/[id]/stream` - SSE endpoint for streaming feedback

### Admin (requires admin role)
- `GET /api/admin/config` - List AI configurations
- `POST /api/admin/config` - Create AI configuration
- `PUT /api/admin/config` - Update AI configuration
- `DELETE /api/admin/config/[id]` - Delete AI configuration
- `GET /api/admin/categories` - List grading standards
- `POST /api/admin/categories` - Create grading standard
- `PUT /api/admin/categories` - Update grading standard
- `DELETE /api/admin/categories/[id]` - Delete grading standard
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/recharge` - Recharge credits (supports bulk)
- `GET /api/admin/submissions` - List all submissions

## 🛠️ Technology Stack

- **Framework**: Next.js 16.2 (App Router)
- **Language**: TypeScript 5
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT + bcryptjs
- **AI Integration**: OpenAI-compatible APIs
- **Styling**: Custom CSS with responsive design
- **Markdown**: marked library
- **Real-time**: Server-Sent Events (EventSource)

## 🔒 Security

- Password hashing with bcrypt (10 rounds)
- JWT-based authentication
- Role-based access control (USER/ADMIN)
- Protected API routes with middleware
- Content safety validation via BASE model
- API keys stored securely in database

## 📱 Responsive Design

- **Mobile** (<640px): Single column, optimized touch targets
- **Tablet** (641-1024px): Two-column grid layouts
- **Desktop** (>1024px): Three-column grid layouts
- Adaptive navigation and tables
- Touch-friendly controls

## 🚀 Deployment

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

### Environment Variables (Optional)

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
```

### Deployment Platforms

- **Vercel** (Recommended): One-click deployment
- **Docker**: Containerize with Node.js image
- **VPS**: Deploy with PM2 or systemd

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## ❓ FAQ

**Q: Task stuck in "PROCESSING" status?**  
A: Check that API keys are correctly configured and endpoints are accessible.

**Q: Images not displaying?**  
A: Images are base64 encoded. Keep individual images under 2MB and prefer JPG format.

**Q: How to modify credit costs?**  
A: Admin login → AI Config → Edit the "Credit Cost" field for each model.

**Q: Can I delete the BASE configuration?**  
A: No, BASE config is required for content safety validation.

**Q: Streaming not working?**  
A: Ensure browser supports EventSource and server isn't buffering SSE responses.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [OpenAI](https://openai.com/) and compatible APIs
- Database management with [Prisma](https://www.prisma.io/)

---

**Made with ❤️ for educators and students**
