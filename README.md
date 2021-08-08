# gate_csv

A browser extension for Gate.io Trade History export to CSV.

__NOTE__: For now the extension works with __Spot__ Trade History only.

## Why

I could not find an easy way to export the data about my orders that would include both the price and the volume.

## Usage
- Open a tab with `Gate.io` and log-in.
- When you are on a trading page (e.g. `https://www.gate.io/en/trade/BTC_USDT`) and click on the extension it will open a pop-up with two buttons: `BTC_USDT` and `ALL PAIRS`. The first one will download the Trade History for BTC/USDT pair, the second - for all the pairs you have ever trade.
- If you are on any other page of `Gate.io`, you will see only `ALL PAIRS`.

## Tech. Details

The extension calls the same API that is used for `Trade History` table pagination, aggregates the results and saves as a `CSV` file.

Request example:
```
Request URL: https://www.gate.io/json_svr/query?u=13&symbol=DOGE_USDT&all_orders=0&type=history_deal&margin_type=&page=1&limit=10
Request Method: GET
```

Notes about the query params:
- when `all_orders` is `1`, the data will be returned for all pairs,
- `u=13` - looks like it is not needed,
- `margin_type=` - looks like it is not needed for Spot
- `limit` - I increased it to 1000

The user should be logged in and be on a `Gate.io` tab as:
- the request requires cookies
- and correct origin
