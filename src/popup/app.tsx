import { ChooseAuthPage } from '@pages/choose-auth-page';
import { RulesPage } from '@pages/rules-page';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

export function App() {
  return (
    <MemoryRouter initialEntries={['/choose-auth']}>
      <Routes>
        <Route path="/choose-auth" element={<ChooseAuthPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
