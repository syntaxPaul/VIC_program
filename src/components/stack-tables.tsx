"use client";

import * as React from "react";

/**
 * Lets a printed report read properly on a phone.
 *
 * Reports are laid out as tables for A4, and there are a dozen of them. Rather
 * than label every cell by hand, this reads each table's column headings once
 * the page is in the browser and writes them onto the cells as data-label,
 * then marks the table stacked. On a phone the `stacked-table` rules turn each
 * row into a labelled card; on paper, and on any screen wider than a phone,
 * nothing changes at all.
 */
export function StackTables({ within }: { within: string }) {
  React.useEffect(() => {
    const root = document.querySelector(within);
    if (!root) return;

    for (const table of root.querySelectorAll("table")) {
      if (table.classList.contains("stacked-table")) continue;
      const heads = [...table.querySelectorAll("thead th")].map((th) =>
        (th.textContent ?? "").trim(),
      );
      if (!heads.length) continue;

      for (const row of table.querySelectorAll("tbody tr, tfoot tr")) {
        let col = 0;
        for (const cell of row.children) {
          const span = Number((cell as HTMLTableCellElement).colSpan) || 1;
          // A cell spanning several columns is a heading or a total's label,
          // not a value, so it keeps no label of its own.
          if (span === 1 && heads[col] && col > 0) {
            cell.setAttribute("data-label", heads[col]);
          }
          col += span;
        }
      }
      table.classList.add("stacked-table");
    }
  }, [within]);

  return null;
}
