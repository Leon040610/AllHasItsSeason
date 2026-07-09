# Task Plan: Data-Driven Refactoring

## Goal
Transform the current static UI uni-app into a data-driven application. First phase uses local storage, second phase uses WeChat Cloud development. 

## Phases
1. [x] **Phase 1: Research and Planning**
   - Read PRD, design specs, and current uni-app codebase.
   - Analyze current page structure and mock data.
   - Design data model, directory structure, local storage strategy, and cloud transition strategy.
   - Output `implementation_plan.md` for user approval.

2. [x] **Phase 2: Establish Base Architecture (Local Storage)**
   - Create root directories: `/services`, `/repositories`, `/models`, `/utils`.
   - Implement `/repositories/localRepository.js` using `uni.getStorageSync` / `uni.setStorageSync` with explicit keys.
   - Implement `ItemModel.js` and `DataConverter.js` for ViewModel generation.
   - Implement `/services/itemService.js` and `/services/settingsService.js` (including backward compatibility).

3. [x] **Phase 3: Refactor Core Items Loop (P0)**
   - Refactor `pages/add/index.vue` and `pages/detail/edit/index.vue` with strict form validation and true data saving.
   - Refactor `pages/detail/index.vue` to fetch data by ID, handle fallback on fail, add double confirmation for delete/done.
   - Refactor `pages/library/index.vue` to fetch list from service via `onShow` and apply ViewModel filtering.
   - Refactor `pages/index/index.vue` to fetch dashboard data and calculate metrics from real items.

4. [ ] **Phase 4: Refactor Settings and Light Features (P1)**
   - Connect reminder settings to `settingsService`.
   - Connect category settings to `categoryService`.
   - Update data management page to show local data status.

5. [ ] **Phase 5: Cloud Development Transition Readiness**
   - Harden `App.vue` `wx.cloud.init()` logic.
   - Stub `/repositories/wechatCloudRepository.js` (without implementing full sync).
