function getPair(url) {
  const tradeScreenMatch = url.match(/.*pro\.coinbase\.com\/trade\/(\w*-\w*)$/i);

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

    let done = false;
    let page = 0;
    let res = [];
    let cursorId = '';

    const activePortfolio = JSON.parse(localStorage.getItem('active-portfolio'));
    const session = JSON.parse(localStorage.getItem('session'));

    while (!done) {
      const params = {
        profile_id: activePortfolio,
        product_id: pair || '',
        // sortedBy: 'price',
        // sorting: 'asc',
        limit: LIMIT,
        after: cursorId,
        status: 'done',
      }

      const url = 'https://api.pro.coinbase.com/orders?' + new URLSearchParams(params); // + '&status=open';

      const response = await fetch(url, { headers: { 'cb-session': session.id } });
      cursorId = response.headers.get('cb-before');

      const chunk = await response.json();

      if (!chunk || !chunk.length || chunk.length < LIMIT) {
        done = true;
      }

      res = res.concat(chunk || []);
      page++;
    }

    if (!res.length) {
      return;
    }

    const url = isRaw ? buildRawDataUrl(res) : await buildParsedDataUrl(res, balances);
    const fileName = `COINBASE-${pair ? pair : 'ALL'} ${(new Date()).toLocaleString().replace(/\/|:/g, '-')}.csv`
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
    const balances = await fetchBalances(session.id);
    const markets = parseMarkets(raw);

    let csv = "data:text/csv;charset=utf-8,";

    for (const [name, market] of markets) {
      const keys = market.buy.trades.length ? Object.keys(market.buy.trades[0]) : Object.keys(market.sell.trades[0]);

      const lastPrice = await getLastPrice(name);
      const balance = findBalance(name, balances);

      csv += `${name},,,,curr. price:,${lastPrice || ''},vol. curr.:,${balance || ''}\n`;
      csv += `,,,,avg. buy:,${market.buy.price},vol. buy:,${market.buy.volume}\n`;
      csv += `,,,,avg. sell:,${market.sell.price},vol. sell:,${market.sell.volume}\n`;
      csv += '\n';

      csv += writeCategory(market.buy, keys);
      csv += writeCategory(market.sell, keys);
      csv += '\n';
    }

    return encodeURI(csv);
  }

  async function fetchBalances(sessionId) {
    try {
      const response = await fetch(`https://api.pro.coinbase.com/accounts/all`, { headers: { 'cb-session': sessionId } });
      return await response.json();
    } catch (err) {
      console.warn('failed to get balances');
      return [];
    }
  }

  function parseMarkets(raw) {
    return raw.reduce((res, curr) => {
      if (!res.has(curr.product_id)) {
        const market = {
          buy: { trades: [], fee: 0, volume: 0, money: 0, price: 0 },
          sell: { trades: [], fee: 0, volume: 0, money: 0, price: 0 }
        };

        res.set(curr.product_id, market);
      }

      const market = res.get(curr.product_id);
      const category = curr.side === 'buy' ? market.buy : market.sell;

      category.trades.push({
        date: curr.done_at,
        market: curr.product_id,
        type: curr.side,
        order: curr.type,
        fee: curr.fill_fees,
        price: curr.price || Number(curr.executed_value) / Number(curr.filled_size),
        volume: curr.filled_size,
        money: curr.executed_value,
      });

      category.fee += Number(curr.fill_fees);
      category.volume += Number(curr.filled_size);
      category.money += Number(curr.executed_value);
      category.price = category.money / category.volume;

      return res;
    }, new Map());
  }

  async function getLastPrice(product_id) {
    try {
      const options = { method: 'GET', headers: { Accept: 'application/json' } };

      const response = await fetch(`https://api.exchange.coinbase.com/products/${product_id}/stats`, options);
      const stats = await response.json();
      return stats.last;
    } catch (err) {
      console.warn('failed to fetch last price:', err);
      return 0;
    }
  }

  function findBalance(product_id, balances) {
    try {
      const token = product_id.split('-')[0];
      const balance = balances.find(({ currency }) => currency === token);

      return balance.balance;
    } catch {
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
    csv += `,,,,${category.fee},${category.price},${category.volume},${category.money}`;
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