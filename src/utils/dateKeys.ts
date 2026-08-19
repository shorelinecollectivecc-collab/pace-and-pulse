export function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function getWeekKey(date: Date) {
  const workingDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNumber = workingDate.getUTCDay() || 7;

  workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(
    Date.UTC(workingDate.getUTCFullYear(), 0, 1)
  );
  const weekNumber = Math.ceil(
    ((workingDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${workingDate.getUTCFullYear()}-w${String(weekNumber).padStart(
    2,
    "0"
  )}`;
}

export function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

export function getMonthKey(date: Date) {
  return getDateKey(date).slice(0, 7);
}
