function getPair(url) {
  const tradeScreenMatch = url.match(/.*gate\.io.*\/trade\/(\w*_\w*)$/i);

  if (tradeScreenMatch && tradeScreenMatch.length > 1) {
    return tradeScreenMatch[1];
  }

  return undefined;
}

async function fetchOrders(pair) {
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

  const url = buildUrl(res);
  const fileName = `GATE-${allOrders ? 'ALL' : pair} ${(new Date()).toLocaleString().replace(/\/|:/g, '-')}.csv`
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