# TNEA Cutoff App Workspace

This document tracks planned features and product ideas. Add notes, edits, and priorities here.

## Confirmed Needed Features

- College predictor mode with three recommendation bands: Safe, Target, Reach.
- Saved shortlist and compare view for selected college-branch options.
- Branch-wise trend chart and downloadable report.
- Bilingual support: English and Tamil toggle.

## Current Baseline (Already Implemented)

- Year-wise data loading for 2020 to 2024.
- Category-wise filter (OC, BC, BCM, MBC, SC, SCA, ST).
- Search by college name, branch name, and branch code.
- Eligibility filter based on user cutoff.
- Sorting, pagination, summary cards, and CSV export.
- Year trend panel by selected college and branch.

## Feature Backlog Ideas

- Predictor confidence score based on multi-year stability.
- District/region filters if college metadata is available.
- Favorite filters and last-session restore (localStorage).
- Quick compare for 2 to 4 branches with mini trend spark-lines.
- Separate opening vs closing rank display if both are available.
- Mobile-first compact cards mode for table rows.
- Dark and light theme switch.

## Data Notes

- d2020.json to d2023.json use top-level arrays.
- d2024.json is wrapped and uses user array for rows.
- Some categories or rank fields may be missing for specific rows.

## Questions To Fill Next

- Should predictor use only selected year or weighted average across years?
- What exact rule should define Safe / Target / Reach bands?
- Do you want a public deployment target (Netlify, GitHub Pages, Vercel)?
- Should Tamil labels be manual translations or dictionary-key based?

## Change Log

- 2026-03-16: Created this planning doc and split app into separate HTML, CSS, and JS files.
