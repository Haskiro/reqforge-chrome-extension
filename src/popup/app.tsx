import { ChooseAuthPage } from '@pages/choose-auth-page';
import { HelpPage } from '@pages/help-page';
import { RulesPage } from '@pages/rules-page';
import { TrafficPage } from '@pages/traffic-page';
import { useEffect } from 'react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from './store';
import { loadAuthMode } from './store/authSlice';
import { loadRulesFromStorage } from './store/rulesSlice';

export const App = () => {
  const dispatch = useAppDispatch();
  const { mode, loaded: authLoaded } = useAppSelector((s) => s.auth);
  const { loaded: rulesLoaded } = useAppSelector((s) => s.rules);

  useEffect(() => {
    const init = async () => {
      await dispatch(loadAuthMode());
      await dispatch(loadRulesFromStorage());
    };
    void init();
  }, [dispatch]);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'keepalive' });
    const interval = setInterval(() => {
      try {
        port.postMessage('ping');
      } catch {
        clearInterval(interval);
      }
    }, 5000);
    port.onDisconnect.addListener(() => clearInterval(interval));
    return () => {
      clearInterval(interval);
      port.disconnect();
    };
  }, []);

  if (!authLoaded || !rulesLoaded) return null;

  const initialRoute = mode !== null ? '/rules' : '/choose-auth';

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/choose-auth" element={<ChooseAuthPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/traffic" element={<TrafficPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="*" element={<Navigate to="/choose-auth" replace />} />
      </Routes>
    </MemoryRouter>
  );
};
