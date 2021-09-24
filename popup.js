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
  switch(exchangeType) {
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

  const pair = exchange.getPair(tab.url);
  if (pair) {
    downloadCurrent.classList.remove('hidden');
    downloadCurrent.innerText = pair;
    downloadCurrent.addEventListener("click", () => exportOrdersHistory(tab.id, pair, exchange));
  }

  const downloadAll = document.getElementById("downloadAll");
  downloadAll.classList.remove('hidden');
  downloadAll.addEventListener("click", () => exportOrdersHistory(tab.id, undefined, exchange));
}

function getExchangeType(url) {
  if (/.*gate\.io.*/i.test(url)) {
    return EXCHANGE_TYPES.GATE;
  }

  if (/.*pro\.coinbase\.com.*/i.test(url)) {
    return EXCHANGE_TYPES.COINBASE;
  }
  
  return EXCHANGE_TYPES.NOT_SUPPORTED
}

function exportOrdersHistory(tabId, pair, exchange) { 
  chrome.scripting.executeScript({
    target: { tabId },
    func: exchange.fetchOrders,
    args: pair ? [pair]: [],
  });
}
