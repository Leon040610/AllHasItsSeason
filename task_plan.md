# P0.1 Multi-Expiry Implementation Plan

## Objectives
Implement the multi-expiry model (`normal`, `after_opening`, `dual`) to accurately track item shelf lives locally as per PRD V1.3.6.

## Execution Checklist

### Phase 1: Data Model & Utils [x]
- [x] Update `models/ItemModel.js`: Add `expiryMode`, `productionDate`, `shelfLifeValue`, `shelfLifeUnit`, `openDate`, `afterOpeningShelfLifeValue`, `afterOpeningShelfLifeUnit`, `activeExpiryDate`, `activeExpirySource`, `lastEditedAt`.
- [x] Update `utils/dateUtils.js`: Add `calculateAfterOpeningDate` and `determineActiveExpiry` to compute the active expiry date safely based on state and mode.
- [x] Update `models/DataConverter.js`: Map new model fields to ViewModel (e.g., `daysLeft`, `statusLabel`, `displayStatus`).

### Phase 2: Service Migration [x]
- [x] Update `services/itemService.js`: Migrate old single-expiry items to normal mode on load.
- [x] Update `services/categoryService.js`: Add `defaultExpiryMode` for categories (food/daily/other -> normal, beauty/medicine/baby -> dual).

### Phase 3: Add Item Page [x]
- [x] Update `pages/add/index.vue`: Add expiryMode segment control.
- [x] Implement conditional display of normal vs after_opening fields.
- [x] Default expiryMode based on selected category.
- [x] Validate required fields on save and calculate date fields.

### Phase 4: Edit Item Page [x]
- [x] Update `pages/detail/edit/index.vue`: Add expiryMode segment control.
- [x] Support modifying productionDate, shelfLife, openDate, afterOpeningShelfLife, and recalculate expiry dates.
- [x] Check if `status` changes from pending to using, and prompt for `openDate` if missing.
- [x] Save updates, update `timeline`, `lastEditedAt`.

### Phase 5: Item Detail Page [x]
- [x] Update `pages/detail/index.vue`: Display multi-expiry fields based on expiryMode.
- [x] Show prompt if fields are missing.
- [x] Update layout to match PRD dates.

### Phase 6: Index & Library Pages [x]
- [x] Update `pages/index/index.vue`: Ensure near-expire/expire counts are based on `activeExpiryDate`.
- [x] Ensure incomplete items do not falsely appear as near-expire.
- [x] Update `pages/library/index.vue`: Ensure filter and sort handles `null` correctly.
- [x] Verify deleted items are hidden and done items don't alert.

### Phase 7: Expiry Calculator [x]
- [x] Implement Calculator tools page to calculate dates based on the two calculation modes.
