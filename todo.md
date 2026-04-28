# Trading Journal - Feature Implementation Checklist

## Phase 1: Database Schema & Backend Setup
- [x] Create database schema with all tables (propFirmAccounts, propFirmPurchases, trades, tradeJournalEntries, tradeScreenshots)
- [x] Generate and apply Drizzle migrations
- [x] Create database query helpers in server/db.ts

## Phase 2: Backend - Trade Management
- [x] Implement trade CRUD procedures (create, read, update, delete)
- [ ] Add trade filtering and sorting procedures (by date, account, instrument, direction)
- [x] Implement P&L calculation helpers (daily, weekly, monthly aggregates)
- [x] Add win rate, profit factor, and statistics calculations
- [x] Implement journal entry CRUD procedures

## Phase 3: Backend - Account Management
- [x] Implement propFirmAccount CRUD procedures
- [x] Implement propFirmPurchase CRUD procedures
- [x] Add account listing and switching logic
- [x] Implement account-scoped trade queries

## Phase 4: Backend - File Uploads & NT8 Import
- [ ] Implement screenshot upload handler (using storagePut)
- [x] Implement NT8 CSV parser (map columns to trade schema)
- [x] Add NT8 import procedure with error handling
- [x] Validate parsed trades before insertion

## Phase 5: Backend - LLM Coaching
- [x] Implement LLM coaching endpoint that queries trades and journal entries
- [x] Create prompt engineering for trade analysis and pattern detection
- [x] Add error handling and response formatting

## Phase 6: Frontend - Theme & Layout
- [x] Implement neon-noir color scheme (midnight navy, hot pink, electric blue, cyan, magenta)
- [x] Create global CSS variables and Tailwind theme customization
- [x] Build DashboardLayout with sidebar navigation
- [x] Implement account switcher component
- [x] Create responsive layout for desktop and tablet

## Phase 7: Frontend - Trade Logging
- [x] Build trade logging form component
- [x] Add form validation (prices, quantities, times)
- [ ] Implement journal entry textarea with tag input
- [ ] Add screenshot upload UI with preview
- [x] Connect form to backend trade creation procedure

## Phase 8: Frontend - Account Management
- [x] Build account manager modal/page
- [x] Implement add/edit/delete account UI
- [ ] Build purchase tracker table and form
- [x] Add account switcher dropdown in header
- [x] Display active account context throughout app

## Phase 9: Frontend - Analytics Dashboard
- [x] Build P&L summary cards (daily, weekly, monthly totals)
- [ ] Implement line chart for P&L over time (using Recharts)
- [ ] Add bar chart for win/loss distribution
- [x] Display statistics cards (win rate, profit factor, avg win/loss)
- [x] Implement account-scoped filtering

## Phase 10: Frontend - Calendar & Trade History
- [ ] Build calendar view component with daily P&L indicators
- [ ] Implement color coding (green for wins, red for losses)
- [ ] Build trade history table with columns (date, instrument, direction, entry/exit, P&L)
- [ ] Add filtering UI (date range, account, instrument, direction)
- [ ] Implement sorting and pagination

## Phase 11: Frontend - NT8 Import & Screenshots
- [ ] Build file upload component for NT8 CSV
- [ ] Add import preview/validation UI
- [ ] Implement error messaging for failed imports
- [ ] Build screenshot gallery for individual trades
- [ ] Add lightbox/modal for image viewing

## Phase 12: Frontend - LLM Coaching
- [ ] Build coaching panel/modal
- [ ] Implement loading state during LLM analysis
- [ ] Display coaching insights with formatting
- [ ] Add refresh/regenerate button
- [ ] Show analysis timestamp and account context

## Phase 13: Testing & Validation
- [x] Write vitest tests for trade CRUD procedures
- [x] Write vitest tests for P&L calculations
- [ ] Write vitest tests for NT8 CSV parser
- [ ] Write vitest tests for account management procedures
- [ ] Test all UI components in browser

## Phase 14: Polish & Optimization
- [ ] Optimize chart rendering performance
- [ ] Add loading skeletons for async operations
- [ ] Implement error boundaries and error UI
- [ ] Add success/error toast notifications
- [ ] Ensure responsive design on mobile
- [ ] Verify neon-noir theme consistency
- [ ] Add keyboard navigation and accessibility features

## Phase 15: Deployment Preparation
- [ ] Create final checkpoint
- [ ] Verify all features work end-to-end
- [ ] Test with sample data and NT8 CSV
- [ ] Prepare deployment documentation
