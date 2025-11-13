# Pairwise Design Guidelines

## Design Approach
**Reference-Based Approach** drawing from industry-leading developer tools:
- **VS Code**: Editor integration, dark theme foundation, file tree patterns
- **Linear**: Clean UI, typography hierarchy, subtle interactions
- **GitHub**: Code review patterns, diff viewing, comment threads
- **Figma**: Real-time collaboration indicators, participant presence

**Core Principle**: Code-first interface where the Monaco editor is the hero, with supporting UI that enhances rather than distracts from the collaborative coding experience.

---

## Typography System

**Font Stack**:
- Primary: `'Inter', system-ui, sans-serif` (Google Fonts)
- Monospace: `'Fira Code', 'Monaco', monospace` (Google Fonts) - for code snippets in UI

**Hierarchy**:
- Page titles: `text-2xl font-semibold` (24px)
- Section headers: `text-lg font-medium` (18px)
- Body text: `text-sm` (14px)
- Labels/metadata: `text-xs font-medium` (12px)
- Code snippets in UI: `text-xs font-mono` (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of `2, 3, 4, 6, 8, 12` (e.g., `p-4`, `gap-6`, `mb-8`)

**Core Layout Structure**:
```
┌─────────────────────────────────────┐
│ Top Nav (h-14)                      │
├─────────────────────────────────────┤
│ ┌──────┬─────────────────┬─────────┐│
│ │ Side │                 │  Right  ││
│ │ Bar  │   Editor Zone   │  Panel  ││
│ │(w-64)│   (flex-1)      │ (w-80)  ││
│ │      │                 │         ││
│ └──────┴─────────────────┴─────────┘│
└─────────────────────────────────────┘
```

**Session Editor Layout** (primary view):
- **Left Sidebar** (w-64): File tree, session participants, snapshot timeline
- **Center** (flex-1): Monaco editor (full height minus top nav)
- **Right Panel** (w-80, collapsible): Comments, chat, session details
- **Top Nav** (h-14): Session title, controls (save snapshot, run code, end session), participant avatars

---

## Component Library

### Navigation & Structure

**Top Navigation Bar**:
- Height: `h-14`, border bottom `border-b`
- Contains: Logo/session title (left), action buttons (center), participant indicators (right)
- Sticky positioning: `sticky top-0 z-50`

**Sidebar**:
- File tree with expand/collapse icons (Heroicons chevron-right/down)
- Nested indentation: `pl-4` per level
- Selected file: subtle highlight treatment
- Dividers between sections: `border-t` with `my-4`

**Collapsible Panels**:
- Toggle button: Heroicons arrow-left/right icons
- Smooth transitions: `transition-all duration-200`
- When collapsed: Show icon-only version at `w-12`

### Session Controls

**Primary Action Buttons**:
- "Take Snapshot": Prominent button with icon (Heroicons camera)
- "Run Code": Icon button with play icon (Heroicons play)
- "End Session": Warning-style button
- Button group spacing: `gap-2`

**Session Status Indicator**:
- Live badge: Pulsing dot animation + "LIVE" text
- Participant count: Number with user icon
- Timer: Running duration display

### Real-Time Collaboration UI

**Participant List**:
- Avatar stack (overlapping): `-space-x-2`
- Active indicator: Small dot on avatar
- Hover shows full name tooltip
- Maximum 5 visible, "+N more" overflow

**Cursor Indicators** (in editor):
- Colored labels above cursor position
- User name + subtle caret pointer
- Distinct colors for up to 8 users

**Live Typing Indicators**:
- Subtle pulse animation on file tree for active files
- "Currently editing" badge next to filenames

### Snapshot Timeline

**Timeline Component** (left sidebar):
- Vertical list with connecting line
- Each snapshot: Timestamp, description preview, author avatar
- Current snapshot: Highlighted with subtle glow
- Hover: Show quick actions (view diff, add comment)
- Spacing: `space-y-3`

**Snapshot Card**:
- Compact: `p-3`, `rounded-lg`
- Metadata line: Time (relative, e.g., "5 min ago"), author
- Description: Truncated to 2 lines
- Expand icon for full view

### Code Review UI

**Inline Comment Markers**:
- Gutter icons in Monaco editor
- Comment count badge
- Click to open comment thread in right panel

**Comment Thread Panel**:
- Threaded replies with left border
- Comment box: Minimal textarea with "Post" button
- Resolve button: Checkbox with "Resolve" label
- Timestamp and author per comment
- Spacing: `space-y-4` between threads

**Diff Viewer**:
- Split view or unified view toggle
- Line numbers with `font-mono text-xs`
- Added lines: Subtle green background tint
- Removed lines: Subtle red background tint
- Unchanged context: Muted treatment

### File Management

**File Tree**:
- Folder icons (Heroicons folder/folder-open)
- File type icons based on extension
- Indentation: `pl-4` per nested level
- Hover: Slight background change
- Right-click context menu: Rename, delete, add file

**File Tabs** (above editor):
- Horizontal scrollable tab bar
- Active tab: Underline accent
- Close buttons on hover
- Max width per tab with ellipsis
- Spacing: `gap-1`

### Session Replay

**Replay Controls**:
- Play/pause button (Heroicons play/pause)
- Scrubber: Range slider showing snapshots as points
- Speed control: 0.5x, 1x, 2x options
- Jump to snapshot: Click timeline points
- Control bar: `h-16` at bottom of editor area

**Playback Indicator**:
- Progress bar above code
- Current snapshot highlighted in timeline
- Auto-scroll to show active code changes

---

## Interactive States

**Buttons**:
- Default: Medium weight, icon + text
- Hover: Slight background brighten, smooth transition
- Active: Subtle press effect with scale-95
- Disabled: Reduced opacity (0.5)

**List Items** (files, snapshots, comments):
- Hover: Background subtle shift
- Selected: Border accent or background fill
- Focus: Keyboard navigation ring

**Real-time Updates**:
- New snapshot: Brief highlight animation
- New comment: Pulse attention indicator
- Participant join/leave: Fade in/out avatar

---

## Accessibility

- All interactive elements: `focus-visible:ring-2` with sufficient contrast
- Icon buttons: Always include `aria-label`
- Keyboard shortcuts: Display in tooltips (e.g., "Cmd+S to snapshot")
- Screen reader announcements for session state changes
- Color is never the only indicator (use icons + text)

---

## Images

**No hero images needed** - this is a utility-focused application where the code editor is the primary visual element.

**Avatar Images**:
- User avatars: 32px × 32px (default), 24px × 24px (compact)
- Placeholder: Initials on colored background
- Load from Gravatar or uploaded files

**Snapshot Thumbnails** (optional enhancement):
- Miniature code preview: 160px × 90px
- Shows key changed lines
- Displayed on timeline hover

---

## Key Principles

1. **Editor-Centric**: Monaco editor always takes priority in space and visual hierarchy
2. **Glanceable State**: Session status, participants, and activity visible at all times
3. **Minimal Distraction**: UI fades into background; code remains focus
4. **Responsive Feedback**: Real-time changes feel instant with optimistic updates
5. **Information Dense**: Pack maximum utility without clutter using consistent spacing