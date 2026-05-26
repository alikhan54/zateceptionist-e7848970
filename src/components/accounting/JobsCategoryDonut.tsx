import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartPie } from "lucide-react";
import { useAccountingJobs } from "@/hooks/useAccountingJobs";
import {
  CATEGORY_BY_CODE,
  type FilingCategory,
} from "@/lib/uk-filing-categories";

interface Props {
  scope?: "open" | "all";
  title?: string;
  className?: string;
}

interface AccountingJobLike {
  id: string;
  status: string;
  category?: string | null;
}

/**
 * MoneyPex parity feature 3: filing pie chart.
 * Shows the current job mix by UK filing category. Uses Recharts donut.
 * Reuses `useAccountingJobs` data — no new fetch.
 */
export function JobsCategoryDonut({
  scope = "open",
  title = "Job mix by category",
  className,
}: Props) {
  const { jobs, isLoading } = useAccountingJobs();

  const data = useMemo(() => {
    if (!jobs) return [];
    const filtered =
      scope === "open"
        ? jobs.filter(
            (j: AccountingJobLike) => j.status !== "done" && j.status !== "cancelled",
          )
        : (jobs as AccountingJobLike[]);
    const counts = new Map<string, number>();
    for (const j of filtered) {
      const k = j.category ?? "untagged";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([code, value]) => {
        const meta = CATEGORY_BY_CODE[code as FilingCategory];
        return {
          name: code === "untagged" ? "Untagged" : meta?.short ?? code,
          fullName: code === "untagged" ? "Untagged" : meta?.label ?? code,
          value,
          color: code === "untagged" ? "hsl(220 14% 60%)" : meta?.color ?? "hsl(220 14% 60%)",
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [jobs, scope]);

  return (
    <Card data-testid="jobs-category-donut" className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ChartPie className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <ChartPie className="h-8 w-8 opacity-40" />
            <span>No jobs yet.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value: string) => <span className="text-xs">{value}</span>}
              />
              <RechartsTooltip
                formatter={(v: number, _name: string, payload: { payload?: { fullName?: string } }) => [
                  `${v} job${v === 1 ? "" : "s"}`,
                  payload?.payload?.fullName ?? "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
