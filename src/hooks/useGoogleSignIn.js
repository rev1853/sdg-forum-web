import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GOOGLE_OAUTH_CONFIG } from '@/config/google';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export const useGoogleSignIn = (onCredential) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const initializedRef = useRef(false);
  const callbackRef = useRef(onCredential);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (window.google?.accounts?.id) {
      setStatus('ready');
      return undefined;
    }

    let script = document.getElementById(GOOGLE_SCRIPT_ID);

    const handleLoad = () => {
      script?.setAttribute('data-loaded', 'true');
      setStatus('ready');
    };

    const handleError = () => {
      setError('Unable to load Google Sign-In. Please check your connection and try again.');
      setStatus('error');
    };

    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      document.head.appendChild(script);
      setStatus('loading');
    } else {
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      const alreadyLoaded =
        script.getAttribute('data-loaded') === 'true' || script.readyState === 'complete';
      setStatus(alreadyLoaded ? 'ready' : 'loading');
      if (alreadyLoaded) {
        handleLoad();
      }
    }

    return () => {
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || initializedRef.current) return;
    const google = window.google?.accounts?.id;
    if (!google) return;

    google.initialize({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      callback: (response) => {
        const credential = response?.credential;
        if (!credential) {
          setError('Google Sign-In did not return an ID token. Please try again.');
          return;
        }
        callbackRef.current?.(credential);
      },
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    initializedRef.current = true;
  }, [status]);

  const ready = status === 'ready';
  const loading = status === 'loading';

  const signIn = useCallback(() => {
    const google = window.google?.accounts?.id;
    if (!google) {
      setError('Google Sign-In is not available right now. Refresh the page and try again.');
      return;
    }

    google.prompt((notification) => {
      if (notification?.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.();
        if (reason && reason !== 'suppressed_by_user') {
          setError('Google Sign-In could not open. Disable pop-up blockers and try again.');
        }
      }

      if (notification?.isSkippedMoment?.()) {
        const reason = notification.getSkippedReason?.();
        if (reason && reason !== 'user_cancelled') {
          setError('Google Sign-In was skipped. Please try again.');
        }
      }
    });
  }, []);

  return useMemo(
    () => ({
      ready,
      loading,
      error,
      signIn,
    }),
    [ready, loading, error, signIn],
  );
};

