

# Al-Ma'arij System — Quran Academy Management & Grading

## Overview
A full-stack, mobile-responsive Arabic RTL web application for managing Quran academy circles, daily evaluations, competitions, and student tracking. Built with React + Tailwind + Supabase (Lovable Cloud).

---

## 1. Authentication & Roles
- **Login page** (Arabic, RTL) for Admin and Teachers
- **Role-based access**: Admin sees everything; Teachers see only their assigned circle
- Roles stored in a dedicated `user_roles` table (admin / teacher)

## 2. Database Schema (Supabase)
- **students** — name, track (فضي/ذهبي/تمهيدي), level, age, parent phone, circle assignment
- **circles** (حلقات) — name, assigned teacher
- **daily_evaluations** — student, week (1–18), day (Sun–Wed), attendance status, uniform/file score (0–3), memorization (0–5), revision (0–5), ma'arij points (0–20)
- **distinguished_circle_scores** — circle, course (1–6), diamond necklace, bee buzz, morals (manual inputs), calculated fields
- **maarij_data** — student, exam %, rewards, level status, points, date, reward_paid flag
- **user_roles** — secure role management
- **academic_calendar** — 19 weeks with mapped events (teacher visits, honor ceremonies)

## 3. Core Pages

### Student Directory (دليل الطلاب)
- Card-based list of all students, filterable by circle
- Clicking a card opens a detail modal: parent phone, age, circle, level, track, progress summary

### Daily Evaluation (التقييم اليومي)
- Select week (1–18) → select day (Sun–Wed)
- Filter by circle
- Accordion list of students — tap to expand input area
- Inputs: attendance (radio), uniform/file (0–3), memorization (0–5), revision (0–5), ma'arij points (0–20)
- Auto-save with error handling (show 0 instead of null)

### Distinguished Circle (الحلقة المتميزة)
- Competition page per course (each course = 3 weeks, 6 total)
- Auto-calculated from daily evaluations: attendance (5 pts), absence penalty (10 pts), uniform (5 pts), file (5 pts)
- Manual inputs: diamond necklace (10 pts), bee buzz (10 pts), morals
- Total score per circle per course — ranking to determine the winning circle
- Reports view with totals

### Wissam Maher (وسام ماهر)
- Per-student report: total attendance days, late count, excused/unexcused absences, total ma'arij points
- Calculated over 5 courses
- Automatic medal notification when a student meets the excellence threshold

### Ma'arij Data & Rewards (بيانات المعارج)
- Table: name, track, level, exam %, rewards, level status (advanced/delayed/disciplined), points, date
- Auto-calculated rewards based on track and exam %:
  - Introductory: 85–94% → 10 pts, 95–100% → 15 pts
  - Silver: 85–94% → 20 pts, 95–100% → 30 pts
  - Gold: 85–94% → 30 pts, 95–100% → 50 pts
- Admin checkbox for "Reward Paid"

### Circles List (الحلقات)
- List of all circles with assigned teacher and student count
- Expandable to see student roster

### Academic Calendar
- 19-week calendar view with mapped events
- Highlights current week/day and shows tasks

### Admin Dashboard
- High-level overview: top-performing circles, attendance trends
- Distinguished Circle ranking
- Quick access to all sections

### Teacher Dashboard
- Streamlined daily check-in for their assigned circle only
- Quick-entry grading interface

## 4. Calculation Engine (Core Logic)
All formulas implemented as reusable functions:
- **Absence Score**: `10 - ((10 / Total_Students) * Absent_Count)`
- **Uniform Score**: `((Count_Grade3 + Count_Grade2) / Total_Circle_Students) * 5`
- **File Score**: `((Count_Grade3 + Count_Grade1) / Total_Circle_Students) * 5`
- **Early Attendance Score**: weighted average based on attendance points
- **Weighted Performance Average**: `(SUMIFS(scores) / (COUNTIFS(present) * 2)) * 5`
- **Auto-aggregation**: daily → weekly → monthly → semester totals

## 5. RTL & Arabic Localization
- Full RTL layout across all pages
- All labels, buttons, and messages in Arabic
- Arabic-friendly typography and spacing

## 6. Mobile Responsiveness
- Card-based, mobile-first design
- Bottom navigation bar for quick access
- Accordion patterns to save space on small screens
- Touch-friendly inputs (large tap targets, radio buttons)

## 7. Export & Sharing
- Generate PDF summary of weekly student performance
- WhatsApp share button for quick parent communication

