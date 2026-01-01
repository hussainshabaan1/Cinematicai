import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'generating':
    case 'analyzing':
      return 'text-blue-500';
    case 'failed':
      return 'text-red-500';
    case 'pending':
    case 'draft':
      return 'text-yellow-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'generating':
    case 'analyzing':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}
