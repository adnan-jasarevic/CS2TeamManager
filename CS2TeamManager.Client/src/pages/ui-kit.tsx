import { useState, type ReactNode } from 'react';
import { Moon, Plus, Settings, Sun, Swords, Trash2, Trophy, Users } from 'lucide-react';
import { useTheme } from '../theme/theme-context';
import { Logo } from '../components/brand/logo';
import { MatchStatusBadge, OutcomeBadge, RoleBadge } from '../components/domain-badges';
import { ListSkeleton } from '../components/page-skeletons';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    CardHeader,
    Checkbox,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    IconButton,
    Input,
    Menu,
    MenuItem,
    MenuSeparator,
    Modal,
    PasswordInput,
    SegmentedControl,
    Select,
    StatGrid,
    StatTile,
    Textarea,
    ToggleChip,
    useToast,
} from '../components/ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card>
            <CardHeader title={title} />
            <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>
        </Card>
    );
}

const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

const SWATCHES = ['canvas', 'surface', 'raised', 'sunken', 'line', 'line-strong', 'fg', 'fg-muted', 'fg-subtle', 'accent', 'accent-text', 'success-text', 'warning-text', 'danger-text'];

/** Development only (/ui-kit): every component in every state, in whichever theme is active. */
export default function UiKit() {
    const { theme, toggleTheme } = useTheme();
    const toast = useToast();
    const [segment, setSegment] = useState('all');
    const [chips, setChips] = useState<string[]>(['Mirage']);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const toggleChip = (chip: string) => setChips(current => current.includes(chip) ? current.filter(c => c !== chip) : [...current, chip]);

    return (
        <main id="main" tabIndex={-1} className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <Logo />
                    <h1 className="mt-3 text-2xl font-black tracking-tight">Design system</h1>
                </div>
                <IconButton
                    onClick={toggleTheme}
                    label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                    icon={theme === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
                />
            </header>

            <Section title="Colour tokens">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {SWATCHES.map(token => (
                        <div key={token}>
                            <div className="h-12 rounded border border-line" style={{ background: `var(--rs-${token})` }} />
                            <p className="mt-1 text-xs text-fg-muted">{token}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Button">
                <Row>
                    <Button leftIcon={<Plus className="size-4" aria-hidden="true" />}>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden="true" />}>Danger</Button>
                </Row>
                <Row>
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                </Row>
                <Row>
                    <Button loading>Saving</Button>
                    <Button loading loadingText="Saving..." variant="secondary">Save</Button>
                    <Button disabled>Disabled</Button>
                    <IconButton label="Settings" icon={<Settings className="size-5" aria-hidden="true" />} />
                    <IconButton label="Invites, 3 pending" badge={3} icon={<Users className="size-5" aria-hidden="true" />} />
                </Row>
            </Section>

            <Section title="Form fields">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Default" hint="Help text goes here."><Input placeholder="Placeholder" /></Field>
                    <Field label="Required" required><Input /></Field>
                    <Field label="Optional" optional><Input /></Field>
                    <Field label="Invalid" error="Enter the opponent's name."><Input /></Field>
                    <Field label="Disabled"><Input disabled value="Can't change this" /></Field>
                    <Field label="Password"><PasswordInput defaultValue="secret" autoComplete="off" /></Field>
                    <Field label="Select"><Select><option>Mirage</option><option>Inferno</option></Select></Field>
                    <Field label="Date"><Input type="datetime-local" /></Field>
                    <Field label="Textarea" className="sm:col-span-2"><Textarea /></Field>
                </div>
                <Checkbox label="Checkbox" defaultChecked />
            </Section>

            <Section title="Selection">
                <SegmentedControl
                    label="Segmented control"
                    value={segment}
                    onChange={setSegment}
                    options={[{ value: 'all', label: 'All' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'results', label: 'Results' }, { value: 'off', label: 'Unavailable', disabled: true }]}
                />
                <Row>
                    {['Mirage', 'Inferno', 'Nuke'].map(chip => (
                        <ToggleChip key={chip} pressed={chips.includes(chip)} onToggle={() => toggleChip(chip)}>{chip}</ToggleChip>
                    ))}
                    <ToggleChip pressed={false} disabled onToggle={() => {}}>Disabled</ToggleChip>
                </Row>
            </Section>

            <Section title="Badges">
                <Row>
                    <Badge>Neutral</Badge>
                    <Badge tone="accent">Accent</Badge>
                    <Badge tone="success">Success</Badge>
                    <Badge tone="warning">Warning</Badge>
                    <Badge tone="danger">Danger</Badge>
                </Row>
                <Row>
                    <OutcomeBadge outcome="WIN" />
                    <OutcomeBadge outcome="Loss" />
                    <OutcomeBadge outcome="Draw" />
                    <MatchStatusBadge status="Live" />
                    <MatchStatusBadge status="Scheduled" />
                    <MatchStatusBadge status="Cancelled" />
                    <RoleBadge role="Owner" />
                    <RoleBadge role="Captain" />
                    <RoleBadge role="Officer" />
                    <RoleBadge role="Player" />
                    <Avatar name="sensei" />
                </Row>
            </Section>

            <Section title="Stat tiles">
                <StatGrid>
                    <StatTile label="Total matches" value={48} icon={<Trophy />} />
                    <StatTile label="Best map" value="Inferno" hint="68%" icon={<Swords />} />
                    <StatTile label="Long label that has to truncate on narrow screens" value="1,204" />
                    <StatTile label="Loading" value={0} loading />
                </StatGrid>
            </Section>

            <Section title="Feedback">
                <Alert>Information.</Alert>
                <Alert tone="success" title="Saved">The match was added.</Alert>
                <Alert tone="warning">This event overlaps another one.</Alert>
                <Alert tone="danger" onDismiss={() => {}}>Failed to save the event.</Alert>
                <Row>
                    <Button variant="secondary" onClick={() => toast.success('Invite sent to player@example.com.')}>Success toast</Button>
                    <Button variant="secondary" onClick={() => toast.error("Couldn't reach the server.")}>Error toast</Button>
                </Row>
            </Section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card><EmptyState compact icon={<Swords />} title="Empty state" description="Says what will appear here." action={<Button size="sm" variant="secondary">Add one</Button>} /></Card>
                <Card><ErrorState compact message="The request timed out." onRetry={() => {}} /></Card>
                <Card><ListSkeleton rows={3} label="Loading example" /></Card>
            </div>

            <Section title="Overlays">
                <Row>
                    <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Open modal</Button>
                    <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>Open confirmation</Button>
                    <Menu label="Example menu" align="start" renderTrigger={trigger => <Button {...trigger} variant="secondary">Open menu</Button>}>
                        <MenuItem onSelect={() => toast.success('Selected.')}>An action</MenuItem>
                        <MenuItem disabled hint="Explains why it's unavailable" onSelect={() => {}}>Disabled action</MenuItem>
                        <MenuSeparator />
                        <MenuItem tone="danger" onSelect={() => toast.success('Selected.')}>Destructive action</MenuItem>
                    </Menu>
                </Row>
            </Section>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Modal title"
                description="An optional description."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsModalOpen(false)}>Save</Button>
                    </>
                }
            >
                <Field label="Name"><Input data-autofocus /></Field>
            </Modal>

            <ConfirmDialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => setIsConfirmOpen(false)} title="Transfer ownership" confirmLabel="Transfer" confirmationText="CONFIRM">
                You are about to give this team to someone else.
            </ConfirmDialog>
        </main>
    );
}
