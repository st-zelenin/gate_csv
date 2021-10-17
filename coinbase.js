function getPair(url) {
  const tradeScreenMatch = url.match(/.*pro\.coinbase\.com\/trade\/(\w*-\w*)$/i);

  if (tradeScreenMatch && tradeScreenMatch.length > 1) {
    return tradeScreenMatch[1];
  }

  return undefined;
}

async function fetchOrders(isRaw, pair) {
  const LIMIT = 1000;
  const allOrders = pair ? 0 : 1;

  let done = false;
  let page = 0;
  let res = [];
  let cursorId = '';

  while (!done) {
    const activePortfolio = JSON.parse(localStorage.getItem('active-portfolio'));
    const session = JSON.parse(localStorage.getItem('session'));

    const params = {
      profile_id: activePortfolio,
      product_id: pair || '',
      // sortedBy: 'price',
      // sorting: 'asc',
      limit: LIMIT,
      after: cursorId,
      status: 'done',
    }

    const url = 'https://api.pro.coinbase.com/orders?' + new URLSearchParams(params) + '&status=open';

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

  const url = buildUrl(res);
  const fileName = `COINBASE-${pair ? pair : 'ALL'} ${(new Date()).toLocaleString().replace(/\/|:/g, '-')}.csv`
  downloadFile(url, fileName);

  function buildUrl(rows) {
    let csv = "data:text/csv;charset=utf-8,";
    const keys = Object.keys(rows[0]);

    csv += keys.join(',') + '\n';
    csv += rows.map(row => Object.values(row).join(',')).join('\n');

    return encodeURI(csv);
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