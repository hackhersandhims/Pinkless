import { Outlet } from 'react-router-dom';
import { PageShell } from './PageShell';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** Shared chrome for every route: header, `#main` landmark, footer. */
export function SiteLayout() {
  return (
    <>
      <SiteHeader />
      <PageShell>
        <Outlet />
      </PageShell>
      <SiteFooter />
    </>
  );
}
