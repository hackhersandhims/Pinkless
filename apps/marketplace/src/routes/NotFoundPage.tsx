import { Link } from 'react-router-dom';
import { EmptyState, PageShell, SiteFooter, SiteHeader } from '../components/index.js';

export function NotFoundPage() {
  return (
    <>
      <SiteHeader />
      <PageShell>
        <h1 className="display">Page not found</h1>
        <EmptyState
          title="We couldn't find that page"
          body="The page you asked for does not exist on the Pinkless Marketplace."
        />
        <p className="body">
          <Link to="/">Back to the Marketplace</Link>
        </p>
      </PageShell>
      <SiteFooter />
    </>
  );
}
