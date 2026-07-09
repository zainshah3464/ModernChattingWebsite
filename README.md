<!-- README.md for Zain Chatting App -->
# Zain Chat — Modern Real‑time Chatting Website

![ZainChat Logo](public/ZainChat%20Logo.png)

*A cosmic, real‑time chat application with glassmorphism UI, smooth animations, and a complete messaging ecosystem.*

![License](https://img.shields.io/badge/license-MIT-blue.svg)  
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)  
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase)  
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)  
[![Live Demo](https://img.shields.io/badge/demo-zain--chat.vercel.app-brightgreen)](https://zain-chat.vercel.app)  
[![GitHub Repo](https://img.shields.io/badge/GitHub-ModernChattingWebsite-171515?logo=github)](https://github.com/zainshah3464/ModernChattingWebsite)

---

## ✨ Features

| Category | Highlights |
|----------|------------|
| 🔐 **Authentication** | Email/Password + Google OAuth, email verification ready (custom SMTP pending) |
| 🌍 **World Chat** | Public real‑time room, file sharing, reactions, typing indicators |
| 💬 **Private Chat** | 1‑on‑1 messaging with read receipts, online status, video/nature backgrounds |
| 👥 **Group Chat** | Create groups, add/remove members, promote admins, group avatar, info panel |
| 🎤 **Voice Messages** | Record and send audio clips directly from chat input |
| 📎 **File Sharing** | Images, videos, audio, documents — upload & preview in‑line |
| 😍 **Emoji Reactions** | Real‑time animated reactions per message (single reaction per user) |
| ⌨️ **Typing Indicators** | See who’s typing in world, private, and group chats |
| ✅ **Read Receipts** | Double‑tick in private, “Seen by X” in groups |
| 📷 **User Gallery** | Upload media, view in a grid, lightbox slideshow |
| 👤 **User Profiles** | Edit avatar, username, full name |
| 🟢 **Online Presence** | Green dot on avatars of online users (PresenceProvider) |
| 🔔 **Unread Badges** | Sidebar & mobile navigation show live unread counts |
| 🌐 **Responsive Design** | Optimised for mobile, tablet, and desktop; safe‑area padding on iOS |
| 🎨 **Glassmorphism UI** | Semi‑transparent backgrounds, blur, and gradient accents |
| ✨ **Animations** | Framer Motion throughout – page transitions, hover effects, message bubbles, 404 page, etc. |

---

## 📸 Screenshots

### World Chat
![World Chat](public/Screenshot%202026-07-09%20204719.png)

### User Search (Private Chat Users)
![User Search](public/Screenshot%202026-07-09%20204745.png)

### Private Chat  
*Best personal messaging experience*  
![Private Chat](public/Screenshot%202026-07-09%20204800.png)

### 404 Page (Lost in Space)
![404 Page](public/Screenshot%202026-07-09%20204830.png)

> **Note:** Some screenshots may not be present in the repository – place your own inside `public/` and update the paths above.

---

## 🛠 Tech Stack

| Layer        | Technologies |
|--------------|--------------|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| **Backend**  | Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) |
| **Deployment** | Vercel (Production) |
| **Icons**    | Lucide React |
| **State**    | React Context API |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm/yarn
- A [Supabase](https://supabase.com) project
- (Optional) Vercel account for deployment

### 1. Clone the repository
```bash
git clone https://github.com/zainshah3464/ModernChattingWebsite.git
cd ModernChattingWebsite
2. Install dependencies
bash
npm install
3. Set up environment variables
Create a .env.local file in the root directory:

env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
⚠️ Never commit this file – it’s already included in .gitignore.

4. Database setup
Run the SQL scripts in your Supabase SQL Editor to create tables, RLS policies, storage buckets, and RPC functions.
(A full migration script will be added soon.)

Essential tables: profiles, private_messages, world_messages, user_gallery, message_reactions, groups, group_messages
Required buckets: gallery, chat_uploads, group-avatars, avatars
RPC functions: add_group_member, remove_group_member, promote_group_admin, demote_group_admin, mark_group_messages_read

5. Start the development server
bash
npm run dev
Open http://localhost:3000 in your browser. The app will automatically reload when you make changes.

📂 Project Structure (Key Folders)
text
chatapp/
├── app/                  # Next.js App Router pages
│   ├── (main)/           # Authenticated layout (world, private, groups, gallery, profile)
│   │   ├── world/
│   │   ├── private/
│   │   ├── groups/
│   │   ├── gallery/
│   │   └── profile/
│   ├── auth/             # Login, signup, OAuth callback, email confirmation
│   ├── layout.tsx        # Root layout (metadata, AuthProvider)
│   ├── not-found.tsx     # Custom 404 page
│   └── error.tsx         # Global error boundary
├── components/           # Reusable UI components
│   ├── chat/             # ChatInput, MessageReactions, GroupInfoPanel
│   ├── layout/           # Sidebar, MobileNav
│   └── providers/        # PresenceProvider, ReactionsPickerProvider
├── lib/                  # Hooks, Supabase clients, utility functions
│   ├── hooks/            # useAuth, useTypingIndicator, useTheme
│   └── supabase/         # Client & server clients
├── middleware.ts         # Auth protection & redirects
├── public/               # Static assets (screenshots, logos, favicons, PWA icons)
└── ...
👨‍💻 Developer
Zain Shah
Web Developer & Software Engineer

🌐 Portfolio: zain-main-web.vercel.app

📧 Email: zainshahz110s@gmail.com

💼 GitHub: @zainshah3464

🔗 LinkedIn: Zain Shah

📸 Instagram: @zainshah3464

🎥 YouTube: @Old Squad

📄 License
This project is licensed under the MIT License.

text
MIT License

Copyright (c) 2026 Zain Shah

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
🌟 Acknowledgements
Supabase – real‑time backend & auth

Framer Motion – animations

Lucide Icons – beautiful icons

Tailwind CSS – styling

All open‑source libraries that made this project possible

Made with ❤️ by Zain Shah







### 1. Clone the repository

```bash
git clone https://github.com/zainshah3464/ModernChattingWebsite.git
cd ModernChattingWebsite


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
