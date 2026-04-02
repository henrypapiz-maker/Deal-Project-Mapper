# Bug Fixes & Patches Log

## Critical (P0)
| ID | Description | Root Cause | Fix | Commit |
|----|-------------|-----------|-----|--------|
| BUG-P0-1 | Cross-border field not persisting | State not saved on intake | Fixed intake callback | 7885b9b |
| BUG-P0-2 | Browser back button exits app | No history management | Added popstate handler | 7885b9b |
| BUG-P0-3 | Duplicate deals on create | Double-submit on click | Added debounce + loading state | 7885b9b |
| BUG-P0-4 | Bowler Table shows 0 cells | React state not hydrated from snapshots | Workaround: refresh on tab switch | e4b2c6e |
| BUG-P0-5 | Snapshot requires 2 clicks | State not updated after POST | Added await + delay + re-fetch | e4b2c6e |

## High (P1)
| ID | Description | Fix | Commit |
|----|-------------|-----|--------|
| BUG-P1-1 | Raw ISO timestamps in UI | Added date formatter utility | 7885b9b |
| BUG-P1-2 | "New Deal" label misleading | Renamed to "Deal Portfolio" | 5f7a442 |
| BUG-P1-3 | Version mismatch (footer vs package) | Aligned all to current version | 7885b9b |
| BUG-P1-4 | API model deprecated | Updated claude-3-5-haiku → claude-haiku-4 | f663236 |
| BUG-P1-5 | Deal loading from DB fails | Fixed GET query + hydration | ce0ed0d |
| BUG-P1-6 | No delete button on portfolio | Added DELETE endpoint + UI button | ce0ed0d |
| BUG-P1-7 | Resume button only checks localStorage | Now falls back to Neon DB | ade0a20 |
| BUG-P1-8 | Bulk assign doesn't update checklist | Fixed loop to trigger re-render | f3a84b5 |
| BUG-P1-9 | FK violation on team_members insert | Reordered: insert team before items | dbe1754 |
| BUG-P1-10 | SteerCo narratives lost on reload | Added auto-load from DB on deal open | 0e24f65 |

## Medium (P2)
| ID | Description | Fix | Commit |
|----|-------------|-----|--------|
| BUG-P2-1 | Stale "443" item count references | Updated all to actual count (531) | ba8ee7c |
| BUG-P2-2 | SteerCo copy button format unclear | Added tooltip + markdown format | e181827 |
| BUG-P2-3 | Tier 2 optionality not obvious | Added "(optional)" hint | 7885b9b |
| BUG-P2-4 | No default selections on required fields | Removed pre-selections | 7885b9b |
| BUG-P2-5 | Getting Started badge never updates | Added phase-based badge progression | e4b2c6e |
| BUG-P2-6 | Owner dropdown not reactive | Team changes now propagate immediately | e4b2c6e |
| BUG-P2-7 | Notes counter shows 0 after add | Partial fix — known remaining issue | e4b2c6e |

## Low (P3)
| ID | Description | Fix | Commit |
|----|-------------|-----|--------|
| BUG-P3-1 | "Phase 1 MVP" label in intake | Removed | e181827 |
| BUG-P3-2 | Webpack cache stale after edit | Clear .next on dev restart | Manual |
