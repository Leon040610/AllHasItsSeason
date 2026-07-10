# Findings & Research

## Multi-Expiry Implementation Details

- **activeExpiryDate Rules**:
  - `normal`: unopenedExpiryDate
  - `after_opening`: openedExpiryDate (if openDate exists)
  - `dual`: min(unopenedExpiryDate, openedExpiryDate) if using & openDate exists, else unopenedExpiryDate.

- **Date Math Rules**:
  - month: exact month addition, end of month fallback.
  - year: exact year addition, leap year fallback.

- **Migration**:
  - Handled in `itemService.js` on list load. If missing `expiryMode`, defaults to `normal` and maps `expireDate` -> `unopenedExpiryDate`.
