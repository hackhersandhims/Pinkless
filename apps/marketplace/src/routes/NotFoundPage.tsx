import { Link } from 'react-router-dom';
import { EmptyState, PageContainer, PageHeading } from '../components/index.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import buttons from '../components/Button.module.css';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <PageContainer>
      <PageHeading title="Page not found" />
      <EmptyState
        title="We couldn't find that page"
        body="The page you asked for does not exist on the Pinkless Marketplace."
      >
        <Link to="/" className={`body ${buttons.button} ${buttons.dark}`}>
          Back to the Marketplace
        </Link>
      </EmptyState>
    </PageContainer>
  );
}
