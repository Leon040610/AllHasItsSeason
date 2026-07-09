/**
 * Date utility functions for the application
 */

// Format date to YYYY-MM-DD
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate expiry date based on production date and shelf life
export function calculateExpiryDate(produceDateStr, shelfLifeValue, shelfLifeUnit) {
  if (!produceDateStr || !shelfLifeValue) return '';
  const value = parseInt(shelfLifeValue, 10);
  if (isNaN(value)) return '';

  const d = new Date(produceDateStr);
  const startDay = d.getDate();

  if (shelfLifeUnit === 'day') {
    d.setDate(d.getDate() + value);
  } else if (shelfLifeUnit === 'month') {
    const startMonth = d.getMonth();
    d.setMonth(startMonth + value);
    // If the new month doesn't have enough days, set to last day of the new month
    if (d.getDate() !== startDay) {
      d.setDate(0); 
    }
  } else if (shelfLifeUnit === 'year') {
    const startYear = d.getFullYear();
    d.setFullYear(startYear + value);
    // Handle Feb 29 leap year edge case
    if (d.getDate() !== startDay) {
      d.setDate(0);
    }
  }
  return formatDate(d);
}

// Calculate difference in days between two dates (date1 - date2)
export function getDaysDifference(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Get today's date formatted as YYYY-MM-DD
export function getTodayStr() {
  return formatDate(new Date());
}
