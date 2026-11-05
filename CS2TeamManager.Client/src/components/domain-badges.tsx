import { Check, Crown, Minus, Radio, Shield, Star, X } from 'lucide-react';
import { Badge, type BadgeTone } from './ui';

const OUTCOMES: Record<string, { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
    win: { label: 'Win', tone: 'success', icon: <Check /> },
    loss: { label: 'Loss', tone: 'danger', icon: <X /> },
    draw: { label: 'Draw', tone: 'neutral', icon: <Minus /> },
};

/** The dashboard API sends "WIN" and the matches API sends "Win", so outcomes are compared without case. */
export function OutcomeBadge({ outcome }: { outcome?: string }) {
    const config = OUTCOMES[outcome?.toLowerCase() ?? ''];
    if (!config) return <Badge className="w-16">{outcome || 'N/A'}</Badge>;
    return <Badge tone={config.tone} icon={config.icon} className="w-16">{config.label}</Badge>;
}

export function MatchStatusBadge({ status }: { status: string }) {
    if (status === 'Live') return <Badge tone="accent" icon={<Radio />} className="min-w-16">Live</Badge>;
    if (status === 'Cancelled') return <Badge className="min-w-16 line-through">Cancelled</Badge>;
    return <Badge className="min-w-16">{status}</Badge>;
}

const ROLES: Record<string, { tone: BadgeTone; icon?: React.ReactNode }> = {
    Captain: { tone: 'warning', icon: <Star /> },
    Officer: { tone: 'neutral', icon: <Shield /> },
};

/** Ownership isn't a role: the Owner also has a role, so this badge sits next to RoleBadge. */
export function OwnerBadge() {
    return <Badge tone="accent" icon={<Crown />}>Owner</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
    const config = ROLES[role] ?? { tone: 'neutral' as const };
    return <Badge tone={config.tone} icon={config.icon}>{role}</Badge>;
}
