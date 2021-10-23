function getPair(url) {
  const tradeScreenMatch = url.match(/.*gate\.io.*\/trade\/(\w*_\w*)$/i);

  if (tradeScreenMatch && tradeScreenMatch.length > 1) {
    return tradeScreenMatch[1];
  }

  return undefined;
}

async function fetchOrders(isRaw, pair) {
  try {
    await importData();
    chrome.runtime.sendMessage('gate.csv:success');
  } catch (err) {
    chrome.runtime.sendMessage('gate.csv:error');
  }

  async function importData() {
    const LIMIT = 1000;
    const allOrders = pair ? 0 : 1;

    let done = false;
    let page = 1;
    let res = [];

    while (!done) {
      let url = `/json_svr/query?all_orders=${allOrders}&type=history_deal&page=${page}&limit=${LIMIT}`;
      if (pair) {
        url += `&symbol=${pair}`;
      }

      const response = await fetch(url);
      const { data: chunk } = await response.json();

      if (!chunk || !chunk.length || chunk.length < LIMIT) {
        done = true;
      }

      res = res.concat(chunk || []);
      page++;
    }

    if (!res.length) {
      return;
    }

    const url = isRaw ? buildRawDataUrl(res) : await buildParsedDataUrl(res);
    const fileName = `GATE-${allOrders ? 'ALL' : pair} ${(new Date()).toLocaleString().replace(/\/|:/g, '-')}.csv`
    downloadFile(url, fileName);
  }

  function buildRawDataUrl(rows) {
    let csv = "data:text/csv;charset=utf-8,";
    const keys = Object.keys(rows[0]);

    csv += keys.join(',') + '\n';
    csv += rows.map(row => Object.values(row).join(',')).join('\n');

    return encodeURI(csv);
  }

  async function buildParsedDataUrl(raw) {
    const tickers = await getTickers(pair);
    const markets = parseMarkets(raw);

    let csv = "data:text/csv;charset=utf-8,";

    for (const [name, market] of markets) {
      const keys = market.buy.trades.length ? Object.keys(market.buy.trades[0]) : Object.keys(market.sell.trades[0]);

      const currencyPair = name.replace('/', '_');
      const lastPrice = getLastPrice(currencyPair, tickers);
      const balance = await getBalance(currencyPair);

      csv += `${name},,,,,curr. price:,${lastPrice || ''},vol. curr.:,${balance || ''}\n`;
      csv += `,,,,,avg. buy:,${market.buy.price},vol. buy:,${market.buy.volume}\n`;
      csv += `,,,,,avg. sell:,${market.sell.price},vol. sell:,${market.sell.volume}\n`;
      csv += '\n';

      // csv += `,,,,,x1.5 - 1,${market.buy.price * 1.5},${market.buy.volume * 0.3}\n`;
      // csv += `,,,,,x1.5 - 2,${market.buy.price * 2.25},${market.buy.volume * 0.21}\n`;
      // csv += `,,,,,x1.5 - 3,${market.buy.price * 3.375},${market.buy.volume * 0.063}\n`;
      // csv += '\n';

      csv += writeCategory(market.buy, keys);
      csv += writeCategory(market.sell, keys);
      csv += '\n';
    }

    return encodeURI(csv);
  }

  async function getTickers(pair) {
    try {
      let url = 'https://api.gateio.ws/api/v4/spot/tickers';
      if (pair) {
        url += `?currency_pair=${pair}`;
      }

      const res = await fetch(url);
      return await res.json();
    } catch (err) {
      console.warn('failed to fetch tickers:', err);
      return [];
    }
  }

  function parseMarkets(raw) {
    return raw.reduce((res, curr) => {
      if (!res.has(curr.market)) {
        const market = {
          buy: { trades: [], fee: 0, volume: 0, money: 0, price: 0 },
          sell: { trades: [], fee: 0, volume: 0, money: 0, price: 0 }
        };

        res.set(curr.market, market);
      }

      const market = res.get(curr.market);
      const category = curr.trade_type === 'buy' ? market.buy : market.sell;

      category.trades.push({
        date: curr.date,
        time: curr.time,
        market: curr.market,
        type: curr.trade_type,
        fee: curr.fee,
        fee_coin: curr.fee_coin.toUpperCase(),
        price: curr.price,
        volume: curr.vol,
        money: curr.money,
      });

      category.fee += Number(curr.fee);
      category.volume += Number(curr.vol);
      category.money += Number(curr.money);
      category.price = category.money / category.volume;

      return res;
    }, new Map());
  }

  function getLastPrice(currencyPair, tickers) {
    if (!tickers || !tickers.length) {
      return 0;
    }

    const ticker = tickers.find(({ currency_pair }) => currency_pair === currencyPair);
    return ticker ? ticker.last : 0;
  }

  async function getBalance(currencyPair) {
    try {
      const options = { method: 'GET', headers: { Accept: 'application/json' } };
      const url = `/json_svr/query/?symbol=${currencyPair}&all_orders=0&type=limit_price`;

      const response = await fetch(url, options);
      const data = await response.json();

      return (data.order || [])
        .filter(({ type }) => type === 'Sell')
        .reduce((res, { vol }) => res + Number(vol), data.balances[0]);
    } catch (err) {
      return 0;
    }
  }

  function writeCategory(category, keys) {
    if (!category.trades.length) {
      return '';
    }

    let csv = keys.join(',') + '\n';
    csv += category.trades.map(trade => Object.values(trade).join(',')).join('\n');
    csv += '\n';
    csv += `,,,,${category.fee},,${category.price},${category.volume},${category.money}`;
    csv += '\n\n';

    return csv;
  }

  function downloadFile(url, fileName) {
    const a = document.createElement("a");
    a.download = fileName;
    a.href = url;
    a.click();

    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 10000);
  }
}

export default {
  getPair,
  fetchOrders,
}
