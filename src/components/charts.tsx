"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatZAR, formatZARCompact } from "@/lib/format";

/* Categorical palette — sequential in lightness so it survives greyscale
   printing, and distinguishable for the common colour-vision deficiencies. */
export const CAT_COLORS = [
  "#7A5C2E", "#2F6F6B", "#9A7738", "#4A6FA5",
  "#8C5A3C", "#5F7A4A", "#C7A86D", "#94794F",
];

const axis = {
  stroke: "var(--text-muted)",
  fontSize: 11.5,
  tickLine: false,
};

function TooltipBox({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-[var(--card)] px-3 py-2 text-[12.5px] shadow-lg">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-muted)] capitalize">{p.name}</span>
          <span className="tnum ml-auto font-medium">{formatZAR(p.value ?? 0, { decimals: false })}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({
  data,
}: {
  data: { month: string; income: number; expense: number; net: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={272}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F6F6B" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2F6F6B" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B4642E" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#B4642E" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" {...axis} axisLine={false} />
        <YAxis
          {...axis}
          axisLine={false}
          width={62}
          tickFormatter={(v) => formatZARCompact(v as number)}
        />
        <Tooltip content={<TooltipBox />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12.5, paddingTop: 8 }}
        />
        <Area
          type="monotone" dataKey="income" name="Income"
          stroke="#2F6F6B" strokeWidth={2} fill="url(#gIncome)"
        />
        <Area
          type="monotone" dataKey="expense" name="Expenditure"
          stroke="#B4642E" strokeWidth={2} fill="url(#gExpense)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) {
    return (
      <p className="py-16 text-center text-[13px] text-[var(--text-muted)]">
        No expenditure recorded yet.
      </p>
    );
  }
  return (
    <div>
      <ResponsiveContainer width="100%" height={168}>
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="name"
            innerRadius={48} outerRadius={76} paddingAngle={2} strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="tnum shrink-0 text-[var(--text-muted)]">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
            <span className="tnum w-20 shrink-0 text-right font-medium">
              {formatZARCompact(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BudgetBars({
  data,
}: {
  data: { name: string; budget: number; actual: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" {...axis} axisLine={false} tickFormatter={(v) => formatZARCompact(v as number)} />
        <YAxis type="category" dataKey="name" {...axis} axisLine={false} width={150} />
        <Tooltip content={<TooltipBox />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12.5 }} />
        <Bar dataKey="budget" name="Budget" fill="#D9D1C0" radius={[0, 3, 3, 0]} />
        <Bar dataKey="actual" name="Actual" fill="#7A5C2E" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttendanceSpark({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axis} axisLine={false} />
        <YAxis {...axis} axisLine={false} width={36} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-lg border bg-[var(--card)] px-3 py-2 text-[12.5px] shadow-lg">
                <p className="font-medium">{label}</p>
                <p className="tnum">{payload[0].value} attended</p>
              </div>
            ) : null
          }
        />
        <Line
          type="monotone" dataKey="value" stroke="#7A5C2E" strokeWidth={2}
          dot={{ r: 2.5, fill: "#7A5C2E" }} activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
