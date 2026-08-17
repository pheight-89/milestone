export function splitSpanByFiscalYear(spanStart, spanEnd) {
  const start = new Date(spanStart);
  const end = new Date(spanEnd);

  // Find the July 1 that falls within the span
  const fiscalBoundary = new Date(start.getFullYear(), 6, 1); // July 1

  // If July 1 is before span start, try next year
  if (fiscalBoundary <= start) {
    fiscalBoundary.setFullYear(fiscalBoundary.getFullYear() + 1);
  }

  // If boundary is after span end, no split needed
  if (fiscalBoundary >= end) {
    return [
      {
        label: `FY${start.getFullYear()}: ${formatDate(start)} – ${formatDate(end)}`,
        start,
        end,
      },
    ];
  }

  // Split into two periods
  const periodOneEnd = new Date(fiscalBoundary);
  periodOneEnd.setDate(periodOneEnd.getDate() - 1); // June 30

  return [
    {
      label: `FY${start.getFullYear()}: ${formatDate(start)} – ${formatDate(periodOneEnd)}`,
      start,
      end: periodOneEnd,
    },
    {
      label: `FY${fiscalBoundary.getFullYear()}: ${formatDate(fiscalBoundary)} – ${formatDate(end)}`,
      start: fiscalBoundary,
      end,
    },
  ];
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
