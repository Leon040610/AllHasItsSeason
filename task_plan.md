# Task Plan: Implement Category and Profile Pages

## Goal
Implement three new pages (`分类设置`, `编辑分类`, `编辑资料`) based on Figma designs, adhering to the `agents.md` guidelines.

## Phases
1. [ ] **Phase 1: Research and Planning**
   - Fetch and analyze Figma node data (Complete).
   - Write `implementation_plan.md` and request user approval.
2. [ ] **Phase 2: Execution - Category Settings (`pages/me/category/index.vue`)**
   - Build layout with category list and counts.
   - Implement "Add Custom Category" button.
   - Configure styles according to Figma (colors, shadows, fonts).
3. [ ] **Phase 3: Execution - Edit Category (`pages/me/category/edit.vue`)**
   - Build category name input.
   - Build category color and icon color pickers.
   - Build icon selection grid.
4. [ ] **Phase 4: Execution - Edit Profile (`pages/me/profile/index.vue`)**
   - Build avatar upload/preview area.
   - Build nickname input field.
   - Build logout and save actions.
5. [ ] **Phase 5: Routing and Integration**
   - Register new pages in `pages.json`.
   - Connect "分类设置" from `pages/me/index.vue` to `pages/me/category/index.vue`.
   - Connect profile editing from `pages/me/index.vue` to `pages/me/profile/index.vue`.
6. [ ] **Phase 6: Verification**
   - Ensure "去 AI 化" and "手账风" guidelines are met.
   - Create walkthrough document.
