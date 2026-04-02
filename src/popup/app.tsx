import { SwDisconnectedModal } from '@components/sw-disconnected-modal';
import { ChooseAuthPage } from '@pages/choose-auth-page';
import { HelpPage } from '@pages/help-page';
import { ModifyRequestPage } from '@pages/modify-request-page';
import { ProfilePage } from '@pages/profile-page';
import { RepeatPage } from '@pages/repeat-page';
import { RulesPage } from '@pages/rules-page';
import { TrafficPage } from '@pages/traffic-page';
import type { WorkerToPopup } from '@shared/messages';
import { useEffect, useRef, useState } from 'react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from './store';
import { loadAuthMode } from './store/authSlice';
import { loadRulesFromServer, loadRulesFromStorage } from './store/rulesSlice';
import { selectAuth, selectRulesState } from './store/selectors';

export const App = () => {
  const dispatch = useAppDispatch();
  const { mode, loaded: authLoaded } = useAppSelector(selectAuth);
  const { loaded: rulesLoaded } = useAppSelector(selectRulesState);
  const [swAlive, setSwAlive] = useState(true);
  const [debuggerDetached, setDebuggerDetached] = useState(false);
  const connectKeepaliveRef = useRef<() => void>(() => {});

  useEffect(() => {
    const init = async () => {
      const authResult = await dispatch(loadAuthMode());
      if (loadAuthMode.fulfilled.match(authResult) && authResult.payload.mode === 'authenticated') {
        await dispatch(loadRulesFromServer(authResult.payload.token!));
      } else {
        await dispatch(loadRulesFromStorage());
      }
    };
    void init();
  }, [dispatch]);

  useEffect(() => {
    let port: chrome.runtime.Port;
    let interval: ReturnType<typeof setInterval>;

    const connect = () => {
      port = chrome.runtime.connect({ name: 'keepalive' });
      setSwAlive(true);
      interval = setInterval(() => {
        try {
          port.postMessage('ping');
        } catch {
          clearInterval(interval);
        }
      }, 5000);
      port.onDisconnect.addListener(() => {
        setSwAlive(false);
        clearInterval(interval);
      });
    };

    connectKeepaliveRef.current = connect;
    connect();

    return () => {
      clearInterval(interval);
      port?.disconnect();
    };
  }, []);

  useEffect(() => {
    const handler = (msg: WorkerToPopup) => {
      if (msg.type === 'DEBUGGER_DETACHED') setDebuggerDetached(true);
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const handleReconnect = async () => {
    connectKeepaliveRef.current();
    await chrome.runtime.sendMessage({ type: 'REATTACH_DEBUGGER' });
    setDebuggerDetached(false);
  };

  if (!authLoaded || !rulesLoaded) return null;

  const initialRoute = mode !== null ? '/rules' : '/choose-auth';

  return (
    <>
      <SwDisconnectedModal open={!swAlive || debuggerDetached} onReconnect={handleReconnect} />
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/choose-auth" element={<ChooseAuthPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/traffic" element={<TrafficPage />} />
          <Route path="/modify-request" element={<ModifyRequestPage />} />
          <Route path="/repeat" element={<RepeatPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/choose-auth" replace />} />
        </Routes>
      </MemoryRouter>
    </>
  );
};
