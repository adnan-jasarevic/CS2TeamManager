import { useEffect, type ReactNode } from 'react';

export interface PageHeaderProps {
    title: string;
    description?: ReactNode;
    /** The page's main actions. They wrap under the title on narrow screens. */
    actions?: ReactNode;
}

/** The page's single h1. Also keeps the browser tab title in step with the page. */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
    useEffect(() => {
        document.title = `${title} · Roster Sensei`;
    }, [title]);

    return (
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end lg:mb-8">
            <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-fg lg:text-3xl">{title}</h1>
                {description && <p className="mt-1 text-sm break-words text-fg-muted lg:text-base">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** The padding and maximum width every page shares. */
export function PageContainer({ children }: { children: ReactNode }) {
    return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>;
}
