import axios from 'axios';
import yaml from 'js-yaml';
import { sessionStorageKeys } from '@/utils/defaults';
import { statusMsg, statusErrorMsg } from '@/utils/CoolConsole';

/* Sets a local storage item with the state from the SW lifecycle */
const setSwStatus = (swStateToSet) => {
  const initialSwState = {
    ready: false,
    registered: false,
    cached: false,
    updateFound: false,
    updated: false,
    offline: false,
    error: false,
    devMode: false,
    disabledByUser: false,
  };
  const sessionData = sessionStorage[sessionStorageKeys.SW_STATUS];
  const currentSwState = sessionData ? JSON.parse(sessionData) : initialSwState;
  try {
    const newSwState = { ...currentSwState, ...swStateToSet };
    sessionStorage.setItem(sessionStorageKeys.SW_STATUS, JSON.stringify(newSwState));
  } catch (e) {
    statusErrorMsg('Service Worker Status', 'Error Updating SW Status', e);
  }
};

/**
 * Checks if service workers should be enabled
 * Disable if not running in production
 * Or disable if user specified to disable
 */
const shouldEnableServiceWorker = async () => {
  const conf = yaml.load((await axios.get('/conf.yml')).data);
  if (conf && conf.appConfig && conf.appConfig.enableServiceWorker) {
    setSwStatus({ disabledByUser: false });
    return true;
  } else if (process.env.NODE_ENV !== 'production') {
    setSwStatus({ devMode: true });
    return false;
  }
  setSwStatus({ disabledByUser: true });
  return false;
};

/* Calls to the print status function */
const printSwStatus = (msg) => {
  statusMsg('Service Worker Status', msg);
};

// const swUrl = `${process.env.BASE_URL || '/'}service-worker.js`;

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && await shouldEnableServiceWorker()) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      printSwStatus('Service Worker registered with scope:', registration.scope);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              printSwStatus('New content is available; please refresh.');
            } else {
              printSwStatus('Content is cached for offline use.');
            }
          }
        };
      };
    } catch (error) {
      printSwStatus(`Service Worker registration failed: ${error}`);
    }
  } else {
    printSwStatus('Service Workers are not supported in this browser or disabled by user.');
  }
};

export default registerServiceWorker;
