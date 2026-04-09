"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DaySwitcher({
  value,
  onChangeAction,
  day1Label,
  day2Label,
  className,
}: {
  value: "1" | "2"
  onChangeAction: (day: "1" | "2") => void
  day1Label: string
  day2Label: string
  className?: string
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChangeAction(v as "1" | "2")}
      className={className}
    >
      <TabsList className="w-full">
        <TabsTrigger value="1">{day1Label}</TabsTrigger>
        <TabsTrigger value="2">{day2Label}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
