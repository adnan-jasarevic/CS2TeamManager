import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChartNoAxesCombined, Moon, Sun, Swords } from 'lucide-react';
import { useTheme } from '../theme/theme-context';
import { Logo, LogoMark } from './brand/logo';
import { SenseiKanji } from './brand/sensei-kanji';
import { IconButton } from './ui';

const HIGHLIGHTS = [
    { icon: CalendarDays, text: 'Schedule praccs, matches and VOD reviews' },
    { icon: Swords, text: 'Log every map, half and overtime' },
    { icon: ChartNoAxesCombined, text: 'See which maps your team really wins' },
];

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
    const { theme, toggleTheme } = useTheme();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    useEffect(() => {
        document.title = `${title} · Roster Sensei`;
    }, [title]);

    return (
        <div className="grid min-h-dvh bg-canvas text-fg lg:grid-cols-[1.1fr_1fr]">
            <aside className="relative hidden overflow-hidden border-r border-line bg-sunken lg:flex lg:flex-col lg:justify-between lg:p-12">
                <div aria-hidden="true" className="rs-seigaiha absolute inset-0 opacity-[0.07]" />

                {/* Sized from the viewport so the sun stays clear of the copy below, at any window height. */}
                <motion.div
                    aria-hidden="true"
                    className="absolute -top-[5%] -right-[8%] size-[min(55vh,38vw)]"
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                    <LogoMark size="100%" />
                    <SenseiKanji className="absolute top-[13%] left-1/2 -translate-x-1/2 text-[clamp(2rem,6vh,3.5rem)] text-on-accent" />
                </motion.div>

                <Logo className="relative" />

                <div className="relative max-w-md">
                    <p className="font-display text-5xl leading-[1.05] font-black tracking-tight text-fg">
                        Every roster needs a sensei.
                    </p>
                    <ul className="mt-8 flex flex-col gap-3">
                        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm font-medium text-fg-muted">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-fg">
                                    <Icon className="size-4" aria-hidden="true" />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            <main className="relative flex flex-col items-center justify-center px-5 py-16 sm:px-8">
                <div className="absolute top-3 right-3">
                    <IconButton
                        onClick={toggleTheme}
                        label={`Switch to ${nextTheme} theme`}
                        icon={theme === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
                    />
                </div>

                <div className="w-full max-w-sm">
                    <Logo className="mb-10 lg:hidden" />
                    <h1 className="text-3xl font-black tracking-tight text-fg">{title}</h1>
                    <p className="mt-1 mb-8 text-sm text-fg-muted">{subtitle}</p>
                    {children}
                    <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>
                </div>
            </main>
        </div>
    );
}
