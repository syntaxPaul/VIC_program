# Go-live checklist

Work through this with whoever keeps the church's books. Most of it is not
a software task.

---

## Before the first real rand goes in

### Deploy it

- [ ] `./deploy/01-provision.sh` — Azure resources created
- [ ] `./deploy/02-deploy.sh` — app live, health check passing
- [ ] `./deploy/03-backups.sh` — nightly dumps scheduled
- [ ] `./deploy/04-restore-drill.sh` — **backups proven to restore**
- [ ] `deploy/.env.azure` saved to a password manager, not left on a laptop

### Make it the church's own

- [ ] `npx tsx prisma/go-live.mts` — demo data gone, real administrator created
- [ ] All four demo accounts (`admin@vic.org` and the rest) confirmed deleted
- [ ] Church name, address and registration numbers correct — they print on
      every report and certificate
- [ ] Accounts created for the treasurer, secretary and pastor
- [ ] Each person has signed in and changed their password

### Get the accounting right

This is where a quiet mistake does the most damage.

- [ ] Accounting officer has reviewed the chart of accounts and asked for
      any additions or removals
- [ ] **Real opening balances entered for every fund**, from the church's
      own records. Every report is wrong if these are.
- [ ] Fund structure agreed — which funds are restricted, and to what
- [ ] Confirmed which funds, if any, are genuinely Section 18A eligible.
      Ordinary tithes and offerings are **not**. If the church is not 18A
      approved, leave it switched off entirely.
- [ ] NPO and PBO registration numbers verified against the actual
      certificates, not from memory
- [ ] Financial year start month confirmed (March aligns with SARS)

### Import the history

- [ ] `npx tsx prisma/import-legacy.mts church_members.db`
- [ ] Anything the importer flagged as unreadable has been fixed by hand
- [ ] Spot-checked five members against the old records

### Prove it in practice

- [ ] Run **two or three services in parallel** with the current paper
      process and compare the totals
- [ ] The treasurer has captured a real offering batch end to end, through
      to posting
- [ ] A count sheet has been printed and actually used by the counters
- [ ] An income and expenditure statement has been printed and shown to
      the church council
- [ ] Someone other than the person who set this up has signed in and found
      what they needed without being told how

---

## In the first month

- [ ] Check the first Azure invoice against the ~$26/month expectation
- [ ] Confirm the nightly backup job has been succeeding
- [ ] Stocktake opened and at least one location verified
- [ ] Decide whether the cold start on the first Sunday visit is acceptable,
      or whether to keep a replica warm

## Once a year

- [ ] Run the restore drill again and record the date
- [ ] Annual stocktake completed, write-offs approved by council resolution
- [ ] Annual financial statements produced within 6 months of year end
- [ ] Full NPO report submitted within 9 months of year end
- [ ] If 18A approved: IT3(d) submissions by 31 October and 31 May — a nil
      declaration is still required if no receipts were issued

---

## Still worth knowing

Present but not automated:

- No login rate limiting, no two-factor authentication, no self-service
  password reset. The administrator resets passwords under Settings → Users.
- Recurring calendar events do not expand automatically; repeating services
  are entered individually.
- Nothing is emailed. Statements and certificates print or save as PDF from
  the browser.

None of these block a congregation of this size. They are stated so nobody
discovers them at an awkward moment.

**The compliance guidance in this application is not legal or tax advice.**
Confirm the church's NPO, PBO and Section 18A position, and the correct
basis for its financial statements, with its accounting officer.
