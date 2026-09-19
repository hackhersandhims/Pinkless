import type { ComponentType } from 'react';
import type { CategorySlug } from '../lib/types';

/**
 * Inline SVG icons, drawn with `currentColor` so they inherit the surrounding
 * token color. All are decorative (`aria-hidden`); any control that uses one
 * carries its own accessible name.
 */
type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m15 5-7 7 7 7" />
    </Icon>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Icon>
  );
}

export function StoreIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0 2.67 2.67 0 0 0 5.33 0" />
      <path d="M5.5 12v8h13v-8" />
      <path d="M10 20v-4.5h4V20" />
    </Icon>
  );
}

export function RazorIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="5.5" y="3.5" width="13" height="6" rx="2" />
      <path d="M8 6.5h8" />
      <rect x="10.5" y="9.5" width="3" height="11" rx="1.5" />
    </Icon>
  );
}

export function DeodorantIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      <rect x="6.5" y="10" width="11" height="11" rx="2" />
      <path d="M6.5 14.5h11" />
    </Icon>
  );
}

export function BodyWashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 7V4h3.5a1 1 0 0 1 1 1v.5" />
      <rect x="10" y="7" width="4" height="3" rx="0.5" />
      <rect x="6" y="10" width="12" height="11" rx="3" />
      <path d="M9 15.5h6" />
    </Icon>
  );
}

export function ShaveCareIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="8" y="7" width="8" height="14" rx="2" />
      <path d="M10 7V4.5h4V7" />
      <path d="M14 4.5h3" />
    </Icon>
  );
}

export function LotionIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M7 10.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V21H7z" />
      <path d="M10.5 8.5V5.5h3v3" />
      <path d="M12 3v2.5" />
    </Icon>
  );
}

export function FaceCareIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M6.5 11V8.5h11V11" />
    </Icon>
  );
}

export function HairCareIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M8 21V9.5a4 4 0 0 1 8 0V21z" />
      <path d="M10 5.5V3h4v2.5" />
    </Icon>
  );
}

export function SoapIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4" y="9" width="16" height="10" rx="4" />
      <circle cx="9" cy="5.5" r="1.5" />
      <circle cx="14" cy="4.5" r="1" />
    </Icon>
  );
}

export const CATEGORY_ICONS: Record<CategorySlug, ComponentType<IconProps>> = {
  razors: RazorIcon,
  deodorant: DeodorantIcon,
  'body-wash': BodyWashIcon,
  'shave-care': ShaveCareIcon,
  lotion: LotionIcon,
  'face-care': FaceCareIcon,
  'hair-care': HairCareIcon,
  soap: SoapIcon,
};
