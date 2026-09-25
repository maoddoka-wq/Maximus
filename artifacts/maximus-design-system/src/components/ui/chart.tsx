import * as React from 'react';
import { cn } from '#lib/utils';
import * as RechartsPrimitive from 'recharts';

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<keyof typeof THEMES, string>;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const chartId = `chart-${id || React.useId().replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'Chart';

const ChartStyle = ({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) => {
  const colors = Object.entries(config).filter(
    ([, value]) => value.theme || value.color,
  );
  if (!colors.length) return null;

  const styles = Object.entries(THEMES)
    .map(
      ([theme, prefix]) =>
        `${prefix} [data-chart=${id}] {\n${colors
          .map(
            ([key, value]) =>
              `  --color-${key}: ${value.theme?.[theme as keyof typeof THEMES] || value.color};`,
          )
          .join('\n')}\n}`,
    )
    .join('\n');

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();
    if (!active || !payload?.length) return null;

    const item = payload[0];
    const key = `${labelKey || item.dataKey || item.name || 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const tooltipLabel =
      !hideLabel &&
      (labelFormatter
        ? labelFormatter(itemConfig?.label || label, payload)
        : itemConfig?.label || label);

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className,
        )}
      >
        {tooltipLabel && (
          <div className={cn('font-medium', labelClassName)}>
            {tooltipLabel}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload
            .filter((entry) => entry.type !== 'none')
            .map((entry, index) => {
              const entryKey = `${nameKey || entry.name || entry.dataKey || 'value'}`;
              const entryConfig = getPayloadConfigFromPayload(
                config,
                entry,
                entryKey,
              );
              const indicatorColor =
                color || entry.payload?.fill || entry.color;

              return (
                <div
                  key={`${entry.dataKey}-${index}`}
                  className="flex w-full flex-wrap items-center gap-2"
                >
                  {!hideIndicator && (
                    <div
                      className={cn(
                        'shrink-0 rounded-[2px]',
                        indicator === 'dot' && 'h-2.5 w-2.5',
                        indicator === 'line' && 'h-2.5 w-1',
                        indicator === 'dashed' &&
                          'w-0 border-[1.5px] border-dashed bg-transparent',
                      )}
                      style={{
                        backgroundColor: indicatorColor,
                        borderColor: indicatorColor,
                      }}
                    />
                  )}
                  <div className="flex flex-1 justify-between leading-none">
                    <span className="text-muted-foreground">
                      {entryConfig?.label || entry.name}
                    </span>
                    {formatter && entry.value !== undefined ? (
                      formatter(
                        entry.value,
                        entry.name ?? entryKey,
                        entry,
                        index,
                        entry.payload,
                      )
                    ) : (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {typeof entry.value === 'number'
                          ? entry.value.toLocaleString()
                          : entry.value}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = 'ChartTooltip';

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== 'none')
        .map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = config[key];

          return (
            <div
              key={item.value}
              className="flex items-center gap-1.5"
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig?.label || item.value}
            </div>
          );
        })}
    </div>
  );
});
ChartLegendContent.displayName = 'ChartLegend';

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) return undefined;

  const record = payload as Record<string, unknown>;
  const nested =
    typeof record.payload === 'object' && record.payload !== null
      ? (record.payload as Record<string, unknown>)
      : undefined;
  const configKey =
    typeof record[key] === 'string'
      ? (record[key] as string)
      : nested && typeof nested[key] === 'string'
        ? (nested[key] as string)
        : key;

  return config[configKey];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};