import { Check, Crown, Minus, Radio, Shield, Star, X } from 'lucide-react';
import type { MatchOutcome } from '../types';
import { Badge, type BadgeTone } from './ui';

const OUTCOMES: Record<MatchOutcome, { tone: BadgeTone; icon: React.ReactNode }> = {
    Win: { tone: 'success', icon: <Check /> },
    Loss: { tone: 'danger', icon: <X /> },
    Draw: { tone: 'neutral', icon: <Minus /> },
};

export function OutcomeBadge({ outcome }: { outcome?: MatchOutcome }) {
    const config = outcome ? OUTCOMES[outcome] : undefined;
    if (!config) return <Badge className="w-16">{outcome || 'N/A'}</Badge>;
    return <Badge tone={config.tone} icon={config.icon} className="w-16">{outcome}</Badge>;
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
