# CanPlan 2.0 — Design Manual
**Version 2.0 · For Mobile Development Teams**

---

## 1. Overview

CanPlan 2.0 is a task-management app designed for clarity and accessibility. Its visual language uses warm cream tones, rounded corners, and high-contrast typography to create an approachable, structured feel. Every screen is built around a single-column scrollable list inside a 390 × 844 pt phone canvas.

---

## 2. Design Tokens

### 2.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#FEF7EE` | App background, screen fills |
| `foreground` | `#1C1A2E` | Primary text, icons |
| `primary` | `#E8623A` | Buttons, active states, accents |
| `primary-gradient` | `#E8623A → #F07B3A` | CTA buttons, hero headers (`135deg`) |
| `secondary` | `#3DB8AD` | Success states, completed indicators |
| `accent` | `#F5C842` | Accent highlight (category colors) |
| `destructive` | `#D4183D` | Delete actions, error states |
| `muted` | `#F5EDE0` | Input backgrounds, section fills |
| `muted-foreground` | `#7A6F6A` | Secondary text, placeholders |
| `text-placeholder` | `#C9BDB5` | Input placeholder text |
| `card` | `#FFFFFF` | Card surfaces |
| `border` | `rgba(28,26,46,0.06)` | Card borders |
| `outer-shell` | `#D6CBBF` | App container background |

#### Semantic surface variants

| Name | Hex | Usage |
|---|---|---|
| `surface-light-orange` | `#FEF0EB` | Icon backgrounds, chips on primary |
| `surface-light-red` | `#FEE8E8` | Delete chip backgrounds |
| `surface-light-teal` | `#EBF9F8` | Done/complete icon backgrounds |
| `surface-warm` | `#F5EDE0` | Muted buttons, input fills |

#### Category colour palette (10 swatches)

```
#E8623A  #3DB8AD  #F5C842  #9B6DFF  #3B82F6
#22C55E  #F97316  #EC4899  #1C1A2E  #D4183D
```

Each category gets a 3-wide vertical pill accent bar on the left edge of its cards.

---

### 2.2 Typography

Two typefaces only. No system fonts in UI.

| Family | Weights used | Role |
|---|---|---|
| **Nunito** | 400, 600, 700, 800, **900 (Black)** | All headings, button labels, numbers, titles |
| **DM Sans** | 400, 500, **600 (SemiBold)** | Body text, metadata, labels, descriptions |

#### Type scale

| Usage | Font | Weight | Size |
|---|---|---|---|
| Screen title | Nunito | Black (900) | 24–28 pt |
| Hero heading | Nunito | Black (900) | 32–40 pt |
| Card title | Nunito | Black (900) | 18–21 pt |
| Section label (caps) | DM Sans | Bold (700) | 11 pt · UPPERCASE · 0.1em tracking |
| Body / metadata | DM Sans | SemiBold (600) | 13–14 pt |
| Caption / timestamp | DM Sans | SemiBold (600) | 11–12 pt |
| Button label | Nunito | Black (900) | 16–20 pt |
| Input text | Nunito | Black (900) | 18–24 pt |
| Input placeholder | DM Sans | Regular (400) | 16 pt · `#C9BDB5` |

---

### 2.3 Spacing & Layout

The app uses a consistent 20 pt horizontal gutter on all screens.

| Token | Value | Usage |
|---|---|---|
| Screen horizontal padding | 20 pt | All scrollable content |
| Card internal padding | 20 pt | Standard card body |
| Stack gap (card list) | 12 pt | Space between cards in a list |
| Section gap | 16 pt | Space between form sections |
| Header height | 48 pt (status bar) + 60 pt (nav bar) | |
| Bottom safe area | 24 pt | Scroll padding below last item |

---

### 2.4 Border Radius

| Context | Value |
|---|---|
| Phone shell | 48 pt |
| Large cards / sheets | 28 pt |
| Medium cards | 24 pt |
| Buttons (full-width) | 28 pt |
| Buttons (compact chip) | 16 pt |
| Icon buttons (square) | 16 pt |
| Icon buttons (circle) | 50% |
| Input fields | 16 pt |
| Progress bars | 9999 pt (pill) |
| Toggle track | 16 pt |

---

### 2.5 Shadows

| Usage | Value |
|---|---|
| Cards, inputs | `0 1px 2px rgba(0,0,0,0.05)` |
| Phone shell | `0 40px 80px rgba(0,0,0,0.25)` |
| Floating buttons | `0 4px 12px rgba(0,0,0,0.15)` |

---

## 3. Component Specifications

### 3.1 Task Card

A tappable card in All Tasks, Categories, and Calendar list views.

```
┌─────────────────────────────────┐
│  [Photo banner — 120 pt tall]   │  ← only if photoUrl exists
├─┬───────────────────────────────┤
│▌│ Task Title          [→ icon] │  ← 3 pt category color left bar
│ │ Category label               │  ← category color text, 11 pt
│ │ X of Y steps done            │  ← muted text, 13 pt
│ │ ████░░░░░░░░░░░░  progress   │  ← 10 pt tall pill bar
└─┴───────────────────────────────┘
```

- **Background:** `#FFFFFF`
- **Border:** `1px solid rgba(28,26,46,0.06)`
- **Radius:** 28 pt
- **Photo banner:** `object-fit: cover`, full width, 120 pt height; category colour bar overlaid on left edge
- **Left bar (no photo):** 6 pt wide, full card height, category colour
- **Progress bar track:** `#F5EDE0`; fill `#E8623A` (in progress) or `#3DB8AD` (all done)
- **Arrow icon:** Lucide `ChevronRight` 18 pt, `#E8623A`
- **Active state:** `scale(0.98)` on press

---

### 3.2 Action Row (Edit Task / Delete Task)

Appears below task cards in All Tasks and Category Detail.

```
┌──────────────────────────────────┐
│  Edit Task  │  Delete Task       │
└──────────────────────────────────┘
```

- Separated by a 1 pt `#F5EDE0` divider
- Top border: 1 pt `#F5EDE0`
- Text: Nunito Black 13 pt · Edit = `#E8623A` · Delete = `#D4183D`
- Hover: Edit bg `#FEF0EB` · Delete bg `#FEE8E8`

---

### 3.3 Buttons

#### Primary CTA (full-width)
- Background: `linear-gradient(135deg, #E8623A, #F07B3A)`
- Text: Nunito Black 18–20 pt, white
- Radius: 28 pt · Padding: 20 pt vertical
- Disabled: bg `#C9BDB5`
- Active: `scale(0.98)`

#### Destructive (full-width)
- Background: `#D4183D`
- Same sizing as Primary CTA

#### Secondary / ghost
- Background: `#F5EDE0` · Text: `#7A6F6A`
- Or outlined: `2px border #E8623A` · Text: `#E8623A`

#### Chip button (small, inline)
- Height: 40 pt · Padding: 0 12 pt
- Radius: 16 pt
- Examples: "Reorder", "Done", "Delete" in header bars

#### Icon button (square)
- Size: 48 × 48 pt · Radius: 16 pt
- Background: `#FFFFFF` with `1px border rgba(0,0,0,0.08)`
- Shadow: `shadow-sm`

#### Icon button (circle)
- Size: 40 × 40 pt · Radius: 50%
- Background: `#FEF0EB` (default) or `#EBF9F8` (complete)

---

### 3.4 Progress Bar

- Height: 10 pt (task detail: tall) / 8 pt (card mini) / 2 pt (header strip)
- Track: `#F5EDE0`
- Fill: `#E8623A` in progress · `#3DB8AD` all done
- Radius: pill (9999 pt)
- Animate width with 500 ms ease transition

---

### 3.5 Input Field (Auth screens)

```
Label (Nunito Bold 16 pt, #1C1A2E)
┌──────────────────────────────────┐
│  Input text                 👁  │  ← eye icon on password fields
└──────────────────────────────────┘
```

- Background: `#F5EDE0`
- Radius: 16 pt
- Padding: 20 pt horizontal · 16 pt vertical
- Text: DM Sans SemiBold 18 pt · `#1C1A2E`
- Placeholder: `#C9BDB5`
- Focus ring: `2px #E8623A` at 40% opacity
- Password eye toggle: Lucide `Eye` / `EyeOff` 20 pt · `#7A6F6A` · taps to toggle `type="password"` ↔ `type="text"`

---

### 3.6 Toggle Switch

```
 ┌────────────────┐
 │  ●             │   OFF — bg #C9BDB5, knob left (3 pt inset)
 └────────────────┘
 ┌────────────────┐
 │             ●  │   ON  — bg #E8623A, knob right (23 pt from left)
 └────────────────┘
```

- Track: 51 × 31 pt · radius 16 pt
- Knob: 25 × 25 pt · white · radius 50% · `box-shadow: 0 1px 3px rgba(0,0,0,0.15)`
- Transition: 200 ms
- Off colour: `#C9BDB5` · On colour: `#E8623A`

---

### 3.7 Bottom Sheet

Used for Add Step, Schedule, Category picker, Category form.

- **Overlay:** `rgba(0,0,0,0.5)` full-screen
- **Sheet bg:** `#FEF7EE`
- **Radius:** top corners 32 pt only
- **Drag handle:** 48 × 6 pt pill · `#C9BDB5` · centred, 12 pt from top
- **Max height:** 88% of screen
- **Header row:** Cancel (left, Nunito Bold 16 pt `#D4183D`) · Title (centre, Nunito Black 18 pt `#1C1A2E`) · Action (right, Nunito Black 16 pt `#E8623A` or `#C9BDB5` disabled)

---

### 3.8 Tab Bar (Calendar)

Underline-style tab bar, 4 tabs.

```
 Overdue   To Do   Done   Skipped
             ▔▔▔▔▔                ← 3 pt rounded underline, active colour
```

- Tab text: Nunito Black 14 pt
- Count badge below label: DM Sans SemiBold 11 pt
- Active: text + underline in tab colour · Inactive: `#7A6F6A` text, `#C9BDB5` count
- Underline: 3 pt height · rounded · `position: absolute bottom: 0`
- Bottom border: 1 pt `#E8D5C4`

| Tab | Colour |
|---|---|
| Overdue | `#D4183D` |
| To Do | `#E8623A` |
| Done | `#3DB8AD` |
| Skipped | `#7A6F6A` |

---

### 3.9 Settings Row

```
┌──────────────────────────────────┐
│ Label text              [right] │
└──────────────────────────────────┘
```

- Padding: 16 pt vertical · 20 pt horizontal
- Divider between rows: 1 pt `#F5EDE0`
- Right element: Toggle / Checkmark / ChevronRight
- Active/hover bg: `#FEF7EE`
- Label: DM Sans SemiBold 16 pt · `#1C1A2E`

---

### 3.10 Step Card (Task Detail)

```
┌───────────────────────────────────────┐
│ [Image banner — 150 pt]               │  ← if imageUrl exists
│ ┌────────────────────────────────────┐│
│ │ ① Title              [Vol] [Done] ││
│ └────────────────────────────────────┘│
└───────────────────────────────────────┘
```

- Card radius: 28 pt · border `rgba(28,26,46,0.06)`
- Completed: `opacity: 0.7` · `border-color: rgba(61,184,173,0.3)`
- Number circle: 36 × 36 pt · Nunito Black 14 pt · white on `#E8623A` (incomplete) or `#3DB8AD` (done)
- Check badge on complete: 16 × 16 pt white circle, bottom-right of number circle, `#3DB8AD` check
- Volume button: 40 × 40 pt · radius 16 pt · bg `#FEF0EB` (idle) or `#E8623A` (speaking) · Lucide `Volume2` / `Square`
- Done/Undo button: pill chip · `#F5EDE0` bg (undo) or white check

---

## 4. Screen-by-Screen Specification

### 4.1 Login

**Header band** (gradient `160deg #E8623A → #F07B3A`)
- App name: Nunito Black 22 pt, white, centred
- Subtitle: DM Sans SemiBold 14 pt, `rgba(255,255,255,0.8)`

**Body** (bg `#FEF7EE`, 24 pt horizontal padding)
- "Sign In" heading: Nunito Black 24 pt `#1C1A2E`
- Fields: Email (text) · Password (password with show toggle)
- "Forgot password?" link: right-aligned · DM Sans SemiBold 13 pt · `#E8623A`
- "Sign In" CTA: primary gradient button
- Divider "or" row
- "Create Account" outlined button: `2px border #E8623A` · text `#E8623A`
- Footer note: DM Sans 14 pt `#7A6F6A`, centred

---

### 4.2 Create Account (Sign Up — Step 1 of 3)

**Header band** — same gradient as Login
- Back arrow button: 44 × 44 pt `rgba(255,255,255,0.2)` rounded
- Title: Nunito Black 30 pt white
- Subtitle: DM Sans SemiBold 16 pt `rgba(255,255,255,0.8)`

**Body**
- Fields: Email · Password (show toggle) · **Confirm Password** (show toggle)
- Mismatch error: DM Sans SemiBold 14 pt `#D4183D` below Confirm field
- "Continue →" CTA: disabled (`#C9BDB5`) until all fields filled AND passwords match
- "Already have an account? Sign in" footer link

---

### 4.3 Verify Email (Step 2 of 3)

**Header band** — gradient
- Title: Nunito Black 30 pt white · "Check your email"
- Subtitle step indicator

**Body**
- 6 OTP digit inputs: each 44 × 56 pt · radius 16 pt
  - Empty: bg `#F5EDE0` · no border
  - Filled: bg `#FEF0EB` · 2 pt `#E8623A` border
- "Verify Email ✓" CTA: disabled until all 6 filled

---

### 4.4 Name Entry (Step 3 of 3)

**Header band** — gradient
- Title: "What's your name?"
- Step indicator

**Body**
- First name field (required) · Last name field (optional)
- "Get Started" CTA: disabled until first name filled

---

### 4.5 Forgot Password

**Header band** — gradient
- Back button · Title · Subtitle

**Body — unsent state**
- Instructions text
- Email field
- "Send Reset Link" CTA

**Body — sent state**
- "Email sent!" heading
- Instruction text
- "Back to Sign In" outlined button

---

### 4.6 Home

**Top bar** (bg `#FEF7EE`)
- Date string: DM Sans SemiBold 16 pt `#7A6F6A`
- Right side: gear icon button (⚙, 36 × 36 pt, rounded, `#F5EDE0` bg) + "Sign out" chip button

**Body**
- "Hi Alex!" hero heading: Nunito Black 40 pt `#1C1A2E`
- Sub: DM Sans SemiBold 16 pt `#7A6F6A`
- 3 menu cards (All Tasks / Categories / Calendar): each primary gradient · padding 24 pt · radius 28 pt · 16 pt stack gap
  - Title: Nunito Black 24 pt white
  - Subtitle: DM Sans SemiBold 14 pt `rgba(255,255,255,0.75)`
  - Right: white chevron

---

### 4.7 All Tasks

**Header bar**
- ← back button
- "All Tasks" title
- "Reorder" chip (visible when ≥ 2 tasks): `#F5EDE0` idle → `#E8623A` active
- ⚙ gear button (48 × 48 pt, `#1C1A2E` bg, white icon): **fixed at bottom-right corner**

**Normal mode**
- List of Task Cards (with photo banner, action row)
- "Add a task" dashed button at bottom

**Reorder mode**
- Simplified card: title + step count + up/down chevron buttons
- "Add a task" hidden

**Simple Mode differences**
- ← back button hidden
- ⚙ gear button still visible at bottom-right
- If Simple Mode starting page is not All Tasks, an orange "Home" pill appears above the gear button

---

### 4.8 Categories

**Header bar** — ← back + "Categories" title

**Category list** (white card, `overflow: hidden`)
- Each row: 3 pt tall coloured pill · Title (Nunito Black 18 pt) · count (DM Sans SemiBold 14 pt `#7A6F6A`) · "Edit" button (right)
- Dividers: 1 pt `#F5EDE0` between rows
- "No Category" bucket shown if any tasks lack a category

**"Add Category"** — full-width dashed button

---

### 4.9 Category Detail

**Header band** (category colour at 13% opacity)
- ← back · category colour pill · category name

**Task cards** — Task Card component with Edit/Delete action row

**Empty state**
- "No tasks here yet" Nunito Black 18 pt `#1C1A2E`
- "Tap 'Add Task' to create one" DM Sans 14 pt `#7A6F6A`

**"Add Task"** — dashed button at bottom

---

### 4.10 Calendar

**Header bar** — ← back · "Calendar"

**Month nav row** — left/right 40 × 40 pt `#F5EDE0` buttons · Month Year Nunito Black 20 pt centred

**Grid**
- 7 columns · day headers: DM Sans Bold 12 pt `#7A6F6A`
- Day cell: 
  - Selected: `#E8623A` bg, white text
  - Today: `#FEF0EB` bg, `#E8623A` text
  - Default: transparent, `#1C1A2E` text
  - Has tasks: 6 × 6 pt dot below number (white on selected, `#E8623A` otherwise)

**Tab bar** — Overdue / To Do / Done / Skipped (see §3.8)

**Task list** — calendar task cards (task title, time · repeat label, step count)

---

### 4.11 Create / Edit Task

**Header bar** — ← back · screen title · "Save ✓" primary button

**Form sections** (white rounded cards, 28 pt radius, 16 pt gap)

1. **Task Name** — large text input (Nunito Black 24 pt)
2. **Task Photo** — file picker; shows dashed camera placeholder or 160 pt image preview with ✕ remove + "Change" overlay button
3. **Steps** — step list with "Reorder" chip; each step row shows number circle, title, Edit + ✕ buttons; "Add a Step" dashed button
4. **Schedule** — taps to open Schedule Sheet; shows repeat label · time · start date; ✕ to clear
5. **Category** — taps to open Category Sheet; shows colour pill + name; ✕ to clear

---

### 4.12 Task Detail

**Header** — ← back · task title + category/progress subtitle

**Progress strip** — 10 pt tall progress bar, full width minus 40 pt margins

**Step cards list** — Step Card components (see §3.10)

**All-done banner** — `#3DB8AD` card · "Great job!" Nunito Black 24 pt white · subtitle DM Sans 16 pt `rgba(255,255,255,0.8)`

---

### 4.13 Step View (fullscreen)

**Image area** — 320 pt tall · `object-fit: cover`
- Dark gradient overlay bottom half: `rgba(0,0,0,0) → rgba(0,0,0,0.5)`
- Back button overlaid top-left: `rgba(0,0,0,0.3)` pill with ← and step label
- Step counter top-right: `rgba(0,0,0,0.3)` pill "X / Y"
- Play icon overlay for video steps

**Content panel**
- Task name: DM Sans Bold 14 pt `#7A6F6A` UPPERCASE tracking
- "Step X" label: Nunito Black 30 pt `#1C1A2E`
- Step title: Nunito Black 24 pt `#1C1A2E`
- Audio player bar (if audio step)
- "Listen to this step" button: `#FEF0EB` bg idle → `#E8623A` speaking with animated bars

**CTA button** (bottom, full-width)
- Not done: "✓ Done — Next step" or "✓ All done!" — primary gradient
- Done: "Undo — not done yet" — `#FEE8E8` bg `#D4183D` text

---

### 4.14 Settings

**Header bar** — ← back · "Settings"

**Menu list** (white rounded card)
- Notifications · Interface · Audio & Speech · iCloud Settings · Statistics · Privacy Policy
- Each row: DM Sans SemiBold 16 pt + Lucide `ChevronRight` `#C9BDB5`
- "App Version: 2.0.0" footer: DM Sans 14 pt `#7A6F6A` centred

#### Settings — Notifications sub-page
- Section header "NOTIFICATIONS ALERT" (caps label style)
- Radio list: None · 15 Minutes Before Event · At Time of Event
- Active row: Lucide `Check` 20 pt `#E8623A` right side

#### Settings — Interface sub-page
- **Starting Page** radio list (Calendar / All Tasks / Categories) — visible note: only active in Simple Mode
- **Options** toggle list:
  - Enable 'Simple Mode'
  - Allow Changing Date in Calendar
  - Use Categories to Manage Tasks
  - Show Overdue Tasks on Launch
  - Only Show Today's Tasks
  - Allow Completing Tasks on Start
  - Automatically Add Completed Tasks to Calendar
- **Task Icon Size** slider (0–100) with Small / Large labels

#### Settings — Audio & Speech sub-page
- "Automatically Play Step Sounds" toggle
- "Speech Speed — X%" slider (0–100)

#### Settings — iCloud Settings sub-page
- "Backup to iCloud" action button (blue `#3B82F6` + `Cloud` icon)
- "Load from iCloud" action button (blue + `CloudDownload` icon)
- Note text + warning text in `#D4183D`

#### Settings — Statistics sub-page
- Read-only rows: Install Date · Steps Completed · Tasks Completed · Days Active

#### Settings — Privacy Policy sub-page
- URL display card
- "Copy link" button

---

## 5. Navigation & Flow

### 5.1 Normal Mode flow

```
Login ──► Home ──► All Tasks ──► Task Detail ──► Step View
               ├──► Categories ──► Category Detail ──► Task Detail
               ├──► Calendar ──► Task Detail
               └──► All Tasks ──► (⚙) Settings
```

### 5.2 Simple Mode flow

When Simple Mode is enabled in Settings > Interface:
- After login, app opens directly on the **Starting Page** (Calendar, All Tasks, or Categories)
- Home screen is completely bypassed
- Settings is accessible via the ⚙ gear button on the All Tasks screen
- Settings "back" returns to the Starting Page (not Home)

### 5.3 Auth flow

```
Login
 ├── Sign Up ──► Verify Email ──► Name Entry ──► [Home or Starting Page]
 └── Forgot Password
```

---

## 6. Interaction Patterns

| Pattern | Spec |
|---|---|
| Button press | `transform: scale(0.98)` on active |
| Icon button press | `transform: scale(0.90)` on active |
| Card press | `transform: scale(0.98)` on active |
| Transitions | `transition: all 150–300 ms ease` |
| Progress fill | `transition: width 500 ms ease` |
| Toggle animate | `transition: left 200 ms ease` (knob position) |
| Sheet open | slides up from bottom over dimmed overlay |
| Inline confirm (delete) | card expands in-place to show Cancel + Delete; no modal |
| Reorder | Up/Down chevron buttons swap adjacent items; no drag |

---

## 7. Data Models

```ts
interface Task {
  id: number
  title: string
  steps: Step[]
  category?: string      // Category.id
  schedule?: Schedule
  photoUrl?: string      // data URL or remote URL
}

interface Step {
  id: number
  title: string
  description?: string
  imageUrl?: string
  mediaType: "photo" | "video" | "audio" | null
  completed: boolean
}

interface Schedule {
  repeat: "none" | "daily" | "weekly" | "two-weeks" | "four-weeks"
        | "monthly" | "two-months" | "yearly" | "weekdays" | "weekends"
  startDate: string   // "YYYY-MM-DD"
  startTime: string   // "HH:MM"
}

interface Category {
  id: string
  label: string
  color: string   // hex
}

interface AppSettings {
  notificationAlert: "none" | "15min" | "attime"
  startingPage: "calendar" | "all-tasks" | "categories"
  simpleMode: boolean
  allowChangingDate: boolean
  useCategories: boolean
  showOverdue: boolean
  onlyToday: boolean
  allowCompleting: boolean
  autoAddCompleted: boolean
  autoPlaySounds: boolean
  speechSpeed: number      // 0–100
  taskIconSize: number     // 0–100
}
```

---

## 8. Icons

All icons are from **Lucide React** (`lucide-react`). Stroke width: `2.0–2.5`. No fill.

| Icon | Context |
|---|---|
| `ArrowLeft` | Back navigation |
| `Plus` | Add actions |
| `Check` | Completion / selection |
| `X` | Close / remove |
| `ChevronUp/Down` | Reorder controls |
| `ChevronLeft/Right` | Month nav / list arrow |
| `Play` | Video/audio playback |
| `Mic` | Audio step indicator |
| `Volume2` | Text-to-speech |
| `Square` | Stop speech |
| `Camera` | Photo picker |
| `Settings` | Settings entry |
| `Home` | Simple mode return |
| `Cloud` | iCloud backup |
| `CloudDownload` | iCloud restore |
| `Eye` / `EyeOff` | Show/hide password |

---

## 9. Accessibility Notes

- All interactive elements minimum **44 × 44 pt** touch target
- Colour is never the sole indicator — labels and icons always accompany
- Text-to-speech built in for every step title (Lucide Volume2 button)
- Adjustable speech speed (0–100%) in Settings > Audio & Speech
- Auto-play step audio optional (off by default) in Settings > Audio & Speech
- Simple Mode designed to reduce navigation complexity for users who need it
- Confirm dialogs for all destructive actions (delete task, delete category, sign out)
- Password fields default to hidden; show/hide toggle on every password input
- All button/action labels in plain language, no icons-only

---

*End of CanPlan 2.0 Design Manual*
