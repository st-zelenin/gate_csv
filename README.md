# gate_csv

A browser extension for [Gate.io](https://www.gate.io/) and [Pro.Coinbase.com](https://pro.coinbase.com/) Trade History export to CSV.

__NOTE__: For now the extension works with __Spot__ Trade History only.

## Why

- [Gate.io](https://www.gate.io/): I could not find an easy way to export the data about my orders that would include both the price and the volume.
- [Pro.Coinbase.com](https://pro.coinbase.com/): I could not find any export functionality on the portal at all.

## Usage
- Open [Gate.io](https://www.gate.io/) or [Pro.Coinbase.com](https://pro.coinbase.com/) and log-in.
- When you are on a trading page (e.g. [https://www.gate.io/en/trade/BTC_USDT](https://www.gate.io/en/trade/BTC_USDT)) and click on the extension it will open a pop-up with two buttons: `BTC_USDT` and `ALL PAIRS`. The first one will download the Trade History for BTC/USDT pair, the second - for all the pairs you have ever trade.
- If you are on any other page of the exchanges, you will see only `ALL PAIRS`.
- The `raw` checkbox will export data as-is (without any parsing) - you can use it if the extension crashes for some reason.

## Tech. Details

The extension calls the same API that is used for `Trade History` table pagination, aggregates the results and saves as a `CSV` file.

Request example (Gate):
```
Request URL: https://www.gate.io/json_svr/query?u=13&symbol=DOGE_USDT&all_orders=0&type=history_deal&margin_type=&page=1&limit=10
Request Method: GET
```

Notes about the query params:
- when `all_orders` is `1`, the data will be returned for all pairs,
- `u=13` - looks like it is not needed,
- `margin_type=` - looks like it is not needed for Spot
- `limit` - I increased it to 1000

The user should be logged in and be on a `Gate.io`/ `Pro.Coinbase.com` tab as:
- the request requires cookies (Gate) or session data (Coinbase)
- and correct origin
