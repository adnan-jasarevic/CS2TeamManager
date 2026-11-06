import { createElement } from 'react';
import { BookOpen, Circle, Clapperboard, ClipboardCheck, Coffee, Crosshair, Flame, Swords, Tag, Trophy, Users, type LucideIcon } from 'lucide-react';
import type { EventTypePreset, TeamEventType } from '../types';

// Every premade type has its own icon as well as a colour, so types can be told apart without seeing colour.
// Custom types share the tag icon and are told apart by name.
const PRESET_ICONS: Record<EventTypePreset, LucideIcon> = {
    Pracc: Crosshair,
    OfficialMatch: Trophy,
    Scrim: Swords,
    VodReview: Clapperboard,
    RecordedMatch: ClipboardCheck,
    Theory: BookOpen,
    Break: Coffee,
    Warmup: Flame,
    Meet: Users,
    Other: Circle,
};

const iconFor = (type: Pick<TeamEventType, 'preset'>): LucideIcon =>
    type.preset ? PRESET_ICONS[type.preset] : Tag;

/** The type's icon, decorative: the type's name is always shown or read out next to it. */
export const EventTypeIcon = ({ type, className }: { type: Pick<TeamEventType, 'preset'>; className?: string }) =>
    createElement(iconFor(type), { className, 'aria-hidden': true });

// Relative luminance from WCAG 2.
const luminance = (hex: string) => {
    const channel = (offset: number) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

const DARK_TEXT = '#0e0b0c';
const LIGHT_TEXT = '#ffffff';

/** Text colour for a label on the type's colour: whichever of near-black and white contrasts more. */
export const textColorFor = (background: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(background)) return LIGHT_TEXT;
    const bg = luminance(background);
    const contrastWithWhite = 1.05 / (bg + 0.05);
    const contrastWithDark = (bg + 0.05) / (luminance(DARK_TEXT) + 0.05);
    return contrastWithDark >= contrastWithWhite ? DARK_TEXT : LIGHT_TEXT;
};

/** The team's "Other" type, which every team always has. */
export const otherTypeOf = (types: TeamEventType[]) => types.find(t => t.isLocked) ?? types[types.length - 1];

/** Types an event can be given. Recorded Match only marks matches recorded on the Matches page. */
export const pickableTypes = (types: TeamEventType[]) => types.filter(t => t.preset !== 'RecordedMatch');
