run();

async function run() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const errorMessage = document.getElementById("errorMessage");
  if (!/.*gate\.io.*/i.test(tab.url)) {
    errorMessage.classList.remove('hidden');
    return;
  }

  let pair = null;

  const downloadCurrent = document.getElementById("downloadCurrent");
  const tradeScreenMatch = tab.url.match(/.*gate\.io.*\/trade\/(\w*_\w*)$/i);

  if (tradeScreenMatch && tradeScreenMatch.length > 1) {
    pair = tradeScreenMatch[1];
    downloadCurrent.classList.remove('hidden');
    downloadCurrent.innerText = pair;
  }

  downloadCurrent.addEventListener("click", () => exportOrdersHistory(tab.id, pair));

  const downloadAll = document.getElementById("downloadAll");
  downloadAll.classList.remove('hidden');
  downloadAll.addEventListener("click", () => exportOrdersHistory(tab.id, pair));
}


async function exportOrdersHistory(tabId, pair) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: fetchOrders,
    args: [pair],
  });
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
  const fileName = `${allOrders ? 'ALL' : pair} ${(new Date()).toLocaleString().replace(/\/|:/g, '-')}.csv`
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