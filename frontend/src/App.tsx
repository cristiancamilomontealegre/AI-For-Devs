import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/app-layout';
import { ProductListPage } from './pages/product-list-page';
import { MovementFormPage } from './pages/movement-form-page';
import { MovementHistoryPage } from './pages/movement-history-page';
import { ProductFormPage } from './pages/product-form-page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/movements" element={<MovementHistoryPage />} />
          <Route path="/movements/new" element={<MovementFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
