# RoyalGambit – Supabase Readiness, Security & Chess Logic Audit

Perform a complete audit of the existing project, fix the identified issues and prepare it for deployment on Vercel with Supabase.

### 1. Supabase Readiness & Password Security
- Inspect the existing authentication, registration, login and user-data handling.
- Check whether the project is ready to integrate Supabase Auth, PostgreSQL and Realtime.
- Verify that passwords are never stored as plaintext, custom-encrypted strings or in localStorage.
- Passwords must be handled by Supabase Auth using its secure password-hashing mechanisms.
- Never store passwords in custom profile tables.
- Check for exposed API keys, secrets, insecure environment variables and sensitive frontend data.
- Identify which existing components need modification before Supabase integration.
- Check database structure, user relationships, game records and access-control requirements.
- Plan appropriate Row Level Security (RLS) policies for user profiles, games, moves and chat.
- Ensure the frontend uses only the Supabase publishable/anon key. Never expose service-role keys.

**Important:** Do not connect or migrate to Supabase yet. First assess readiness and prepare the necessary changes without breaking the existing working application.

### 2. Fix Chess Captured-Piece Counting and Material Values

There is a bug in the captured-piece display and material calculation during games.

Fix the entire system using standard chess piece values:

| Piece | Value |
|---|---:|
| Pawn | 1 |
| Knight | 3 |
| Bishop | 3 |
| Rook | 5 |
| Queen | 9 |
| King | Not capturable |

Verify that:
- Captured pieces are attributed to the correct player.
- The number of captured pieces is accurate.
- The material advantage calculation is correct.
- Capturing two queens counts as two queens, not one.
- The material score reflects the actual values of captured pieces.
- Captured-piece icons and counts update immediately.
- A piece is never counted twice.
- Promotions, en passant, undo, game restoration and online synchronization do not corrupt the counts.
- The captured-piece display remains correct throughout the entire game.

Use the actual chess move history or authoritative game state as the source of truth, not unreliable UI counters.

### 3. Full Chess Logic Audit

Inspect and test:
- Legal moves and illegal moves.
- Captures and special moves.
- Castling, en passant and promotion.
- Check, checkmate and stalemate.
- Draw detection.
- Undo and game review.
- Premove execution.
- Timers, resignation and timeout.
- Move history and board synchronization.
- Game completion and statistics.

Fix any discovered bugs without changing intended gameplay.

### 4. Vercel Deployment Compatibility

Check:
- Production build succeeds.
- No missing environment variables or hardcoded secrets.
- Client-side and server-side code are separated correctly.
- Routes and page refreshes work on Vercel.
- Existing assets load correctly.
- No runtime errors or broken integrations.

### 5. Final Report

Provide:
1. Whether the project is ready for Supabase integration.
2. What needs changing before integration.
3. Whether password handling is currently secure.
4. Any security vulnerabilities found and fixed.
5. Chess bugs found and fixed.
6. Whether the production build succeeds.
7. Any remaining issues that prevent deployment.

**Critical:** Preserve the existing application and its working features. Do not unnecessarily rebuild, redesign, migrate databases or introduce dependencies. Make changes incrementally and verify the project still builds after each significant change.