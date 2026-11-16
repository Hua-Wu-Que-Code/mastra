import { z } from 'zod/v4';
import type { SidebarLink } from '../nav/sidebar-nav-link';
import { t } from '@/lib/i18n';

export const sidebarLinkPlacements = ['sidebar', 'more', 'hidden'] as const;
export type SidebarLinkPlacement = (typeof sidebarLinkPlacements)[number];

export const sidebarLinkPlacementLabels: Record<SidebarLinkPlacement, string> = {
  get sidebar() {
    return t('Always show');
  },
  get more() {
    return t('Hide in More menu');
  },
  get hidden() {
    return t('Never show');
  },
};

export const placementsSchema = z.record(z.string(), z.enum(sidebarLinkPlacements));
export type SidebarLinkPlacements = z.infer<typeof placementsSchema>;

export const defaultVisibilityStorageKey = 'mastra:sidebar:link-visibility';

export type OptionalSidebarLink = SidebarLink & { defaultVisible?: boolean };

export function getSidebarLinkKey(link: SidebarLink) {
  return `${link.url}:${link.id ?? link.name}`;
}

export function getSidebarVisibilityKey(sectionKey: string, link: SidebarLink) {
  return `${sectionKey}:${link.id ?? link.name}`;
}

export function getDefaultPlacement(link: OptionalSidebarLink, optionalLinkCount: number): SidebarLinkPlacement {
  const visible = link.defaultVisible ?? optionalLinkCount < 2;
  return visible ? 'sidebar' : 'more';
}

export function isSidebarLinkPlacement(value: unknown): value is SidebarLinkPlacement {
  return sidebarLinkPlacements.some(placement => placement === value);
}
