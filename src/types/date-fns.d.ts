// Ambient type stub for date-fns.
// date-fns 4.x ships proper types but the workspace root "type": "commonjs"
// causes TS bundler resolution to pick .d.cts over .d.ts.
// This stub suppresses TS7016 while Next.js bundles date-fns normally at runtime.
declare module 'date-fns' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function format(date: Date | number, formatStr: string, options?: any): string;
  export function formatDistanceToNow(date: Date | number, options?: { addSuffix?: boolean; locale?: unknown }): string;
  export function isToday(date: Date | number): boolean;
  export function isTomorrow(date: Date | number): boolean;
  export function isPast(date: Date | number): boolean;
  export function subDays(date: Date | number, amount: number): Date;
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function addDays(date: Date | number, amount: number): Date;
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
}
