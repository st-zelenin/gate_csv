function getPair(url) {
  const tradeScreenMatch = url.match(/.*gate\.io.*\/trade\/(\w*_\w*)$/i);

  if (tradeScreenMatch && tradeScreenMatch.length > 1) {
    return tradeScreenMatch[1];
  }

  return undefined;
}

async function fetchOrders(isRaw, pair) {
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

  const url = isRaw ? buildRawDataUrl(res) : buildParsedDataUrl(res);
  const fileName = `GATE-${allOrders ? 'ALL' : pair} ${(new Date()).toLocaleString().replace(/\/|:/g, '-')}.csv`
  downloadFile(url, fileName);

  function buildRawDataUrl(rows) {
    let csv = "data:text/csv;charset=utf-8,";
    const keys = Object.keys(rows[0]);

    csv += keys.join(',') + '\n';
    csv += rows.map(row => Object.values(row).join(',')).join('\n');

    return encodeURI(csv);
  }

  function buildParsedDataUrl(raw) {
    const markets = parseMarkets(raw);

    let csv = "data:text/csv;charset=utf-8,";

    for (const [name, market] of markets) {
      const keys = market.buy.trades.length ? Object.keys(market.buy.trades[0]) : market.sell.trades[0];

      csv += `${name}\n\n`;
      csv += writeCategory(market.buy, keys);
      csv += writeCategory(market.sell, keys);
      csv += '\n';
    }

    return encodeURI(csv);
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