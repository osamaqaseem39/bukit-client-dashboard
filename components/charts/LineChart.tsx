"use client";

import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface LineChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  lines: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  height?: number;
}

export default function LineChart({
  data,
  dataKey,
  lines,
  height = 300,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
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
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
