import { LoadingRegion, Skeleton } from './ui';
import { PageContainer } from './page-header';

/** Rows shaped like the real lists, so content doesn't jump when it arrives. */
export function ListSkeleton({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
    return (
        <LoadingRegion label={label} className="divide-y divide-line">
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-6 w-14 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-5 w-10 shrink-0" />
                </div>
            ))}
        </LoadingRegion>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-line bg-surface p-4 lg:p-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                </div>
            ))}
        </div>
    );
}

export function PanelSkeleton({ height = 'h-64' }: { height?: string }) {
    return <Skeleton className={`${height} w-full rounded-lg`} />;
}

/** Stands in for a whole page while its code or its team list loads. */
export function PageSkeleton({ label = 'Loading page' }: { label?: string }) {
    return (
        <PageContainer>
            <LoadingRegion label={label} className="flex flex-col gap-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <StatsSkeleton />
                <PanelSkeleton />
            </LoadingRegion>
        </PageContainer>
    );
}
