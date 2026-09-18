import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './routes/HomePage.js';
import { CategoryPage } from './routes/CategoryPage.js';
import { ComparePage } from './routes/ComparePage.js';
import { NotFoundPage } from './routes/NotFoundPage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/compare/:id" element={<ComparePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
