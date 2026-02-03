"use client";

import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  bars: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  height?: number;
}

export default function BarChart({
  data,
  dataKey,
  bars,
  height = 300,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
        <XAxis
          dataKey={dataKey}
          stroke="rgb(var(--text-secondary))"
          style={{ fontSize: "12px" }}
        />
        <YAxis
          stroke="rgb(var(--text-secondary))"
          style={{ fontSize: "12px" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgb(var(--surface))",
            border: "1px solid rgb(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
