// Stock Market Academy — Live Stock Prices
// Fetches from Yahoo Finance server-side (no CORS issues)
// No API key needed. Completely free.

var SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS',        'HDFCBANK.NS',   'INFY.NS',
  'ICICIBANK.NS','WIPRO.NS',      'BAJFINANCE.NS',  'TATAMOTORS.NS',
  'SUNPHARMA.NS','MARUTI.NS',     'ASIANPAINT.NS',  'LTIM.NS',
  'AXISBANK.NS', 'NESTLEIND.NS',  'HINDUNILVR.NS',  'TITAN.NS',
  'POWERGRID.NS','ONGC.NS',       'COALINDIA.NS',   'HCLTECH.NS'
];

var FALLBACK = {
  RELIANCE:2847, TCS:3912, HDFCBANK:1634, INFY:1479, ICICIBANK:1189,
  WIPRO:467, BAJFINANCE:7224, TATAMOTORS:825, SUNPHARMA:1623, MARUTI:12304,
  ASIANPAINT:2856, LTIM:5432, AXISBANK:1098, NESTLEIND:2367, HINDUNILVR:2198,
  TITAN:3421, POWERGRID:298, ONGC:267, COALINDIA:434, HCLTECH:1876
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=15');

  if (req.method === 'OPTIONS') return res.status(200).end();

  var symbolStr = SYMBOLS.join(',');
  var fields = 'regularMarketPrice,regularMarketOpen,regularMarketPreviousClose,regularMarketChangePercent,regularMarketVolume,regularMarketDayHigh,regularMarketDayLow';
  var urls = [
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + symbolStr + '&fields=' + fields,
    'https://query2.finance.yahoo.com/v7/finance/quote?symbols=' + symbolStr + '&fields=' + fields
  ];

  var quotes = [];
  var source = 'fallback';

  for (var i = 0; i < urls.length; i++) {
    try {
      var response = await fetch(urls[i], {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://finance.yahoo.com/'
        }
      });

      if (!response.ok) continue;

      var data = await response.json();
      var result = data && data.quoteResponse && data.quoteResponse.result;

      if (Array.isArray(result) && result.length >= 10) {
        quotes = result;
        source = i === 0 ? 'yahoo_q1' : 'yahoo_q2';
        break;
      }
    } catch (err) {
      console.warn('[SMA Stocks] URL failed:', err.message);
      continue;
    }
  }

  var prices = {};

  if (quotes.length >= 10) {
    quotes.forEach(function(q) {
      var sym = q.symbol.replace('.NS', '');
      prices[sym] = {
        price:         Math.round((q.regularMarketPrice         || FALLBACK[sym] || 0) * 100) / 100,
        open:          Math.round((q.regularMarketOpen          || q.regularMarketPrice || 0) * 100) / 100,
        prevClose:     Math.round((q.regularMarketPreviousClose || q.regularMarketPrice || 0) * 100) / 100,
        changePercent: Math.round((q.regularMarketChangePercent || 0) * 100) / 100,
        volume:        q.regularMarketVolume || 0,
        dayHigh:       Math.round((q.regularMarketDayHigh || 0) * 100) / 100,
        dayLow:        Math.round((q.regularMarketDayLow  || 0) * 100) / 100,
        live: true
      };
    });
  } else {
    Object.keys(FALLBACK).forEach(function(sym) {
      prices[sym] = {
        price: FALLBACK[sym], open: FALLBACK[sym], prevClose: FALLBACK[sym],
        changePercent: 0, volume: 0, dayHigh: FALLBACK[sym], dayLow: FALLBACK[sym],
        live: false
      };
    });
  }

  return res.json({
    prices: prices,
    source: source,
    isLive: source !== 'fallback',
    fetchedAt: new Date().toISOString(),
    message: source === 'fallback'
      ? 'Yahoo Finance unavailable — simulation mode. Market may be closed.'
      : 'Live prices from Yahoo Finance (' + quotes.length + ' stocks)'
  });
};
