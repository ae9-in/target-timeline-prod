# Deployment Guide — Targets & Timelines

This document provides instructions for deploying and running the Targets & Timelines monorepo application.

## Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: v18 or later (v20+ recommended)
* **PostgreSQL**: v14 or later (running on port `5432`)
* **Redis**: v5 or later (running on port `6379`)

---

## Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "project-targets-timeline"
   ```

2. Install the monorepo dependencies:
   ```bash
   npm install
   ```

---

## Database Configuration

1. Set up your environment variables by copying `.env.example` to `.env` in `apps/api/`:
   ```bash
   cp .env.example apps/api/.env
   ```

2. Adjust the variables inside `apps/api/.env` if your database credentials differ from the defaults.

3. Push the schema to your database and generate the Prisma Client:
   ```bash
   npm run db:push --workspace=api
   ```
   *(Or run `npx prisma db push` inside `apps/api/`)*

4. Seed the database with default roles, permissions, and test accounts:
   ```bash
   npm run db:seed --workspace=api
   ```
   *(Or run `npx prisma db seed` inside `apps/api/`)*

---

## Building and Running

### Development Mode

To start both the NestJS API server and the Vite React frontend concurrently in development mode, run:
```bash
npm run dev
```
* **NestJS API**: runs on [http://localhost:3000](http://localhost:3000)
* **React Web Frontend**: runs on [http://localhost:5173](http://localhost:5173)

### Production Mode

1. Build both workspaces:
   ```bash
   npm run build
   ```

2. Run the NestJS backend in production mode:
   ```bash
   npm run start:prod --workspace=api
   ```

3. Preview or host the React frontend build output from the `apps/web/dist` folder using a web server like Nginx or http-server:
   ```bash
   npm run preview --workspace=web
   ```

---

## Pre-seeded Test Accounts

You can log in to the system using the following test accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@targets.com` | `AdminSecure123!` |
| **Leadership** | `leader@targets.com` | `LeaderSecure123!` |
| **Sales Manager** | `sales@targets.com` | `SalesSecure123!` |
| **Production Manager** | `prod@targets.com` | `ProdSecure123!` |
| **Hiring/HR Manager** | `hr@targets.com` | `HrSecure123!` |
| **Planning Analyst** | `planner@targets.com` | `PlannerSecure123!` |
| **Viewer** | `viewer@targets.com` | `ViewerSecure123!` |

*Note: Roles like Super Admin and Leadership will prompt you to scan a QR code to configure Multi-Factor Authentication (MFA) on your first login.*
