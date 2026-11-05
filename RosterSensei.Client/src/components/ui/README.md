# Roster Sensei design system

Reusable UI for the client: design tokens, a dark and a light theme, and accessible components.
To see every component in every state, run `npm run dev` and open `/ui-kit`. That page only exists
in development builds.

## Architecture

```
src/
  styles/tokens.css     Colour, type and radius tokens for both themes. The only place colours live.
  theme/                ThemeProvider and useTheme(). Dark is the default.
  hooks/use-resource.ts Data loading: loading, error, retry, and protection from stale responses.
  components/
    ui/                 Generic building blocks. They know nothing about teams or matches.
    brand/logo.tsx      The logo.
    domain-badges.tsx   Outcome, status and role badges, built on ui/Badge.
    team-gate.tsx       Loading, error and no-team states shared by every team page.
    page-header.tsx     The page's h1, its actions and the browser tab title.
    app-layout.tsx      Sidebar, bottom tabs, team state, and focus handling on navigation.
  pages/                Screens composed from the above.
```

Dependencies only point downwards: pages use components, components use `ui/`, and `ui/` uses tokens.

### Rules

1. **Use tokens, never raw colours.** Write `bg-surface text-fg-muted`, not `bg-[#171314]`. A new
   token needs a value in both themes.
2. **Red means two things, so keep them apart.** `accent` is the brand and primary actions. `danger`
   is a loss or an error, and always comes with an icon or text. Green and gold are status colours only.
3. **Native first.** `<dialog>` and radio buttons bring keyboard and screen reader behaviour for
   free. Only build a custom widget when no native element does the job. `Select` is one: the popup
   of a native `<select>` can't be themed reliably.
4. **Every view that loads data handles four states:** loading, error, empty and data.
5. **Never put rays on the logo's sun.** The rayed sun flag is offensive in much of Asia.

### Colour contrast

All text pairs meet WCAG AA (4.5:1) in both themes, and borders and focus rings meet 3:1. Re-check
when changing a token, including text on the tinted `*-soft` backgrounds.

## Components

Import everything from `components/ui`.

### Button, LinkButton, IconButton

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `primary \| secondary \| ghost \| danger` | `primary` | `LinkButton` defaults to `secondary` |
| `size` | `sm \| md \| lg` | `md` | `sm` grows to 44px on touch screens |
| `loading` | `boolean` | `false` | Shows a spinner and ignores clicks, but keeps focus (unlike `disabled`) |
| `loadingText` | `string` | | Replaces the label while loading |
| `leftIcon`, `rightIcon` | `ReactNode` | | Mark icons `aria-hidden` |
| `fullWidth` | `boolean` | `false` | |

`Button` defaults to `type="button"`, so it can't submit a form by accident. `IconButton` requires
`label`, because an icon alone says nothing to a screen reader, and accepts a `badge` count.

```tsx
<Button loading={isSaving} loadingText="Saving..." leftIcon={<Save className="size-4" aria-hidden="true" />}>
    Save
</Button>
<LinkButton to="/matches">View all matches</LinkButton>
<IconButton label="View invites, 3 pending" badge={3} icon={<Bell className="size-5" aria-hidden="true" />} />
```

### Field, Input, Select, Textarea, PasswordInput, Checkbox

`Field` connects its label, hint and error to the control inside it, including `aria-invalid` and
`aria-describedby`.

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` | Required |
| `hint` | `ReactNode` | Hidden while there's an error |
| `error` | `ReactNode` | Marks the control invalid |
| `required`, `optional` | `boolean` | Adds the marker and passes `required` to the control |
| `hideLabel` | `boolean` | Keeps the label for screen readers only |

```tsx
<Field label="Opponent" required error={submitted && !name ? "Enter the opponent's name." : undefined}>
    <Input value={name} onChange={e => setName(e.target.value)} data-autofocus />
</Field>
```

`Select` takes its choices as `options` and calls `onChange` with the new value, not an event. The
value type is inferred from the options. It's a controlled button, so it doesn't submit with a form.
An option's `hint` is a smaller second line in the open list. The closed control shows only the
label, so keep the part people need to recognise a choice in `label`.

```tsx
<Field label="Role">
    <Select value={role} onChange={setRole} options={[
        { value: 'Player', label: 'Player' },
        { value: 'Officer', label: 'Officer', hint: 'Same rights as the Captain' },
    ]} />
</Field>
```

### SegmentedControl, ToggleChip

`SegmentedControl` picks one of a few options using native radios, so arrow keys work. `ToggleChip`
is an independent on/off choice. The value type is inferred from the options.

```tsx
<SegmentedControl label="Show" hideLabel value={filter} onChange={setFilter} options={[
    { value: 'all', label: 'All' },
    { value: 'results', label: 'Results' },
]} />
<ToggleChip pressed={selected} onToggle={toggle} disabled={limitReached}>Mirage</ToggleChip>
```

### Modal

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open`, `onClose` | | | Controlled. `onClose` fires for Esc, the close button and the backdrop |
| `title`, `description` | `ReactNode` | | Wired up as the dialog's accessible name and description |
| `footer` | `ReactNode` | | Pinned below the scrolling body |
| `size` | `sm \| md \| lg` | `md` | A bottom sheet on phones |
| `tone` | `default \| danger` | `default` | |
| `busy` | `boolean` | `false` | Blocks every way of closing while a request runs |
| `closeOnBackdrop` | `boolean` | `true` | Turn off for forms, so a stray click can't lose typed input |
| `returnFocusRef` | `RefObject` | | Where focus goes on close if the opener may be gone |

Mark the control to focus first with `data-autofocus`. React's `autoFocus` runs before the dialog
opens, so it doesn't work here. Connect a footer button to a form with the `form` attribute:

```tsx
<Modal open={open} onClose={close} title="Invite player" busy={sending} closeOnBackdrop={false} footer={
    <>
        <Button variant="ghost" onClick={close} disabled={sending}>Cancel</Button>
        <Button type="submit" form="invite-form" loading={sending}>Send invite</Button>
    </>
}>
    <form id="invite-form" onSubmit={send}>
        <Field label="Email"><Input type="email" required data-autofocus /></Field>
    </form>
</Modal>
```

### ConfirmDialog

For actions that are hard to undo. It starts on Cancel, so a stray Enter is harmless. Add
`confirmationText` for the most serious actions, to make the user type a word first.

```tsx
<ConfirmDialog
    open={confirming}
    onClose={() => setConfirming(false)}
    onConfirm={transfer}
    title="Transfer ownership"
    confirmLabel="Transfer"
    busy={working}
    error={error}
    confirmationText="CONFIRM"
>
    You will lose Owner privileges.
</ConfirmDialog>
```

### Menu, Popover

Both render into `<body>`, so a card with `overflow: hidden` can't clip them, and both flip above
the trigger when there's no room below. `Menu` follows the ARIA menu keyboard pattern. A disabled
`MenuItem` stays focusable, so its `hint` can explain why it's unavailable.

```tsx
<Menu label="Actions for yuki" renderTrigger={trigger => (
    <IconButton {...trigger} label="Actions for yuki" icon={<EllipsisVertical className="size-5" aria-hidden="true" />} />
)}>
    <MenuItem onSelect={changeRole}>Change role</MenuItem>
    <MenuItem disabled hint="Make them an Officer first" onSelect={transfer}>Transfer ownership</MenuItem>
    <MenuSeparator />
    <MenuItem tone="danger" onSelect={kick}>Kick player</MenuItem>
</Menu>
```

### Feedback: Alert and useToast

Use `Alert` for feedback tied to a place on the page. Use a toast for anything else, typically
success after a dialog closes. Success toasts dismiss themselves and pause while hovered or focused.
Error toasts stay until dismissed.

```tsx
const toast = useToast();
toast.success('Invite sent.');

<Alert tone="danger" onDismiss={clear}>Failed to save the event.</Alert>
```

### Loading, empty and error states

```tsx
<LoadingRegion label="Loading players"><Skeleton className="h-4 w-1/3" /></LoadingRegion>
<EmptyState icon={<Swords />} title="No matches yet" description="Matches appear here once added." action={<Button>Add a match</Button>} />
<ErrorState message={error} onRetry={reload} retrying={isFetching} />
```

`LoadingRegion` announces its label once and hides the skeleton shapes from screen readers. Size
skeletons like the real content, so the page doesn't jump when data arrives.

### Display: Card, CardHeader, Badge, Avatar, StatGrid, StatTile

```tsx
<Card>
    <CardHeader title="Recent matches" description="Last 30 days" action={<Button size="sm">Add</Button>} />
</Card>

<StatGrid>
    <StatTile label="Win rate" value="62.5%" icon={<Percent />} />
    <StatTile label="Best map" value="Inferno" hint="68%" />
    <StatTile label="Upcoming" value={0} loading />
</StatGrid>

<Badge tone="success" icon={<Check />}>Win</Badge>
```

## Loading data: useResource

```tsx
const load = useCallback<ResourceLoader<Match[]>>(
    signal => api.get<Match[]>(`/Matches/${team.id}`, { signal }).then(r => r.data),
    [team.id],
);
const { data, error, isLoading, isFetching, reload } = useResource(load, 'Failed to load matches.');
```

Always pass `signal` so a superseded request is cancelled, and wrap the loader in `useCallback`:
its identity is what tells the hook the request changed. A new function means new data, and `null`
means wait. Add `{ keepPrevious: true }` for filters and date ranges, so the old data stays on
screen while the new data loads.

## Building a team page

`TeamGate` handles the loading, error and no-team states, so the content always has a team. The
`key` starts the content fresh on a team switch, so nothing carries over from the previous team.

```tsx
export default function Matches() {
    return (
        <TeamGate title="Matches">
            {team => <MatchesContent key={team.id} team={team} />}
        </TeamGate>
    );
}
```
