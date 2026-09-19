import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/index.js';
import { HomePage } from './routes/HomePage.js';
import { SearchPage } from './routes/SearchPage.js';
import { CategoryPage } from './routes/CategoryPage.js';
import { ComparePage } from './routes/ComparePage.js';
import { NotFoundPage } from './routes/NotFoundPage.js';
import { ScrollManager } from './routes/ScrollManager.js';
import { ComparisonsProvider } from './routes/useComparisons.js';

export function App() {
  return (
    <BrowserRouter>
      <ComparisonsProvider>
        <ScrollManager />
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/compare/:id" element={<ComparePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ComparisonsProvider>
    </BrowserRouter>
  );
}
