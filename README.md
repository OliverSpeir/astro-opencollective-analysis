# Astro OpenCollective Budget Analysis

A financial dashboard for analyzing [Astro's OpenCollective](https://opencollective.com/astrodotbuild) transaction data.

## Exporting OpenCollective Data

1. Go to [opencollective.com/astrodotbuild/transactions](https://opencollective.com/astrodotbuild/transactions)
2. Click the **Export** button
3. Configure export settings:
   - **Fields:** Platform Default (27 out of 85 fields selected)
   - **Use field IDs as column headers:** No (unchecked)
   - **Export taxes and payment processor fees as columns:** Yes (checked)
4. Download the CSV
5. Place it at `src/content/astrodotbuild-transactions.csv`

## How It Works

**Analysis**: Pure functions in `src/lib/analysis.ts` aggregate transactions into monthly summaries, expense categories, contributor breakdowns, and runway projections

- Monthly income vs expenses breakdown
- Cumulative balance over time
- Expense categorization (paid maintainers, community incentives, fees, misc)
- Recurring vs one-time contribution analysis
- Paid maintainer stipend tracking with % of income calculations
- Top contributors and recipients tables
- Runway projection based on recent trends

All financial calculations happen at build time, resulting in a fully static site with no runtime data processing.
