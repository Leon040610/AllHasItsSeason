# Task Plan - P3.1 Implementation

## Phase 1: Research and Setup
- [/] Read required files (PRD, design docs, existing services, models, utils)
- [ ] Research cloud functions configuration for settings syncing
- [ ] Identify WeChat subscription template fields and constraints
- [ ] Write findings to findings.md
- [ ] Finalize implementation_plan.md and get user approval

## Phase 2: Date Utils & Expiry Logic Unification
- [ ] Unify daysLeft, activeExpiryDate, 临期/过期判定
- [ ] Ensure itemService.js and all views (home, library) use the same utility functions
- [ ] Clarify expiry rules for: normal, after_opening, dual (unopened/opened)
- [ ] Define fixed rule for whether expired items can trigger reminders

## Phase 3: Upgrade Reminder Settings Fields
- [ ] Add/update settings fields in local storage and cloud database (reminder_settings)
- [ ] Implement field compatibility and migration in settingsService.js
- [ ] Ensure DataConverter.js handles new fields correctly during sync

## Phase 4: WeChat Subscription Integration
- [ ] Access/read settings.env or config to fetch WeChat Template ID securely
- [ ] Handle UI reminder switch toggle
- [ ] Call wx.requestSubscribeMessage upon user interaction
- [ ] Record subscriptionLastResult, subscriptionLastRequestedAt, inAppEnabled, enabled, subscriptionIntent
- [ ] Implement user-friendly feedback toasts based on authorization result
- [ ] Ensure no automatic popups and no actual message sending

## Phase 5: Verification and Walkthrough
- [ ] Verify using unit tests or mock data converter
- [ ] Draft walkthrough.md with verification results
