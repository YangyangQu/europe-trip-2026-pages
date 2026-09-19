# V33 Live Geneva Replan

Updated 2026-09-19 around 13:00 CEST: luggage already shipped via SBB; day-pass pickup moved to ~13:00; Geneva route compressed and optimized; main train target 16:54 Genève → 19:53 Interlaken West.

# Europe Trip 2026 — GitHub Pages + Encrypted Ticket Vault

Public travel-handbook mirror with a client-side encrypted ticket wallet.

## What is public

- itinerary
- food guide
- transport / hotel information
- todo checklist
- encrypted ticket binary files

## What is NOT public in plaintext

- ticket PDFs / images
- QR codes / barcodes
- booking confirmations
- passenger-specific ticket details
- ticket-vault password
- Cloudflare secrets / admin

Ticket files are encrypted locally with:

- PBKDF2-HMAC-SHA256
- 310,000 iterations
- AES-256-GCM
- random vault salt
- random 96-bit IV per file

GitHub receives only encrypted `.enc` files.

## First-time setup

From the GitHub Pages repository:

```bash
cd ~/Downloads/europe-trip-2026-pages

# Copy the V32 site files here first, then:
node build_ticket_vault.mjs \
  ~/Downloads/travel-handbook-cloudflare/private-ticket-repo/tickets
```

The script asks for the vault password twice and does not save it.

Use a memorable password of at least 12 characters.
Do NOT use a 4–6 digit PIN.

Then:

```bash
git add .
git commit -m "Add encrypted web ticket vault"
git push
```

GitHub Pages URL remains:

https://yangyangqu.github.io/europe-trip-2026-pages/

Ticket page:

https://yangyangqu.github.io/europe-trip-2026-pages/#/tickets

## How your companion uses it

1. Open the GitHub Pages URL in Safari.
2. Tap `票夹`.
3. Enter the shared vault password.
4. Tap a ticket to open its decrypted PDF/image.
5. Tap `缓存全部加密票据` once on a good connection so encrypted ticket files are available offline too.

The password can be remembered for the current Safari tab/session only.

## Security note

This is client-side encryption, not server-side access control.
A strong password matters because anyone can download the encrypted files and try passwords offline.

For highest operational reliability, important boarding passes / QR tickets should still also be saved to Apple Wallet or iPhone Files before travel.
