import GateExchange from './gate.js';
import CoinbaseExchange from './coinbase.js';

const EXCHANGE_TYPES = {
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  GATE: 'GATE',
  COINBASE: 'COINBASE',
}

run();

async function run() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const exchangeType = getExchangeType(tab.url);

  let exchange;
  switch (exchangeType) {
    case EXCHANGE_TYPES.GATE: {
      exchange = GateExchange;
      break;
    }
    case EXCHANGE_TYPES.COINBASE: {
      exchange = CoinbaseExchange;
      break;
    }
    case EXCHANGE_TYPES.NOT_SUPPORTED:
    default: {
      const errorMessage = document.getElementById("errorMessage");
      errorMessage.classList.remove('hidden');
      return;
    }
  }

  const getRecentFilled = document.getElementById("getRecentFilled");
  getRecentFilled.classList.remove('hidden');
  getRecentFilled.addEventListener("click", () => showRecentFilled(tab.id, exchange));

  const pair = exchange.getPair(tab.url);
  if (pair) {
    const downloadCurrent = document.getElementById("downloadCurrent");
    downloadCurrent.classList.remove('hidden');
    downloadCurrent.innerText = pair;
    downloadCurrent.addEventListener("click", () => exportOrdersHistory(tab.id, pair, exchange));
  }

  const downloadAll = document.getElementById("downloadAll");
  downloadAll.classList.remove('hidden');
  downloadAll.addEventListener("click", () => exportOrdersHistory(tab.id, undefined, exchange));

  document.getElementById("rawLabel").classList.remove('hidden');
}

function getExchangeType(url) {
  if (/.*gate\.io.*/i.test(url)) {
    return EXCHANGE_TYPES.GATE;
  }

  if (/.*pro\.coinbase\.com.*/i.test(url)) {
    return EXCHANGE_TYPES.COINBASE;
  }

  return EXCHANGE_TYPES.NOT_SUPPORTED;
}

function exportOrdersHistory(tabId, pair, exchange) {
  const isRaw = document.getElementById("isRaw").checked;

  document.getElementById("loading").classList.remove('hidden');

  chrome.scripting.executeScript({
    target: { tabId },
    func: exchange.fetchOrders,
    args: pair ? [isRaw, pair] : [isRaw],
  }, () => {
    const listener = message => {
      if ('gate.csv:success' === message || 'gate.csv:error' === message) {
        chrome.runtime.onMessage.removeListener(listener);
        document.getElementById("loading").classList.add('hidden');
      }
    };

    chrome.runtime.onMessage.addListener(listener);
  });
}

function showRecentFilled(tabId, exchange) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: exchange.showRecentFilled,
    args: [],
  }, () => {
    window.close();
  });
}
