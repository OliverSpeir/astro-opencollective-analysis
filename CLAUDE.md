# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start dev server at localhost:4321
pnpm build    # Build production site to ./dist/
pnpm preview  # Preview production build locally
```

## Architecture

This is an Astro site that analyzes OpenCollective transaction data for the Astro project. It loads CSV transaction data at build time and renders financial charts/tables.

### Data Flow

1. **CSV Data Source**: Transaction CSV file placed in `src/content/` is loaded via `@ascorbic/csv-loader`
2. **Content Collection**: `src/content/config.ts` defines the schema with Zod validation for all transaction fields
3. **Analysis Functions**: `src/lib/analysis.ts` contains pure functions that process transaction arrays and return aggregated data (monthly summaries, expense breakdowns, contributor analysis, runway projections)
4. **Page Rendering**: `src/pages/index.astro` calls analysis functions at build time, renders summary cards and tables, and passes chart data to client-side Chart.js via JSON script tag

### Key Files

- `src/content/config.ts` - Transaction schema definition (must match CSV columns exactly)
- `src/lib/analysis.ts` - All financial analysis logic (filtering reversed transactions, categorizing expenses, calculating runway)
- `src/pages/index.astro` - Dashboard page with Chart.js visualizations

### CSV Requirements

The transaction CSV must be placed at `src/content/astrodotbuild-transactions.csv` with the filename matching the loader config. Export settings: Platform Default fields, field IDs as headers: false, taxes/fees as columns: true.
