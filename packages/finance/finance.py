#!/usr/bin/env python
# -*- coding:utf-8 -*-

import requests
import os
from time import time
import utils
import time
import quandl
import pandas as pd
from whoosh.index import create_in, open_dir
from whoosh.fields import *
from whoosh.qparser import QueryParser
import shutil
from whoosh import scoring
import mplfinance as mpf

filepath = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'index')
assetspath = 'app/dist/assets/'
xnas = os.path.join(filepath, "XNAS_metadata.csv")
bitfinex = os.path.join(filepath, "BITFINEX_metadata.csv")
bitfinex_coins = os.path.join(filepath, "coins")
indexdir = os.path.join(filepath, "indexdir")

quandl.ApiConfig.api_key = "aH839xotMQD84wXrZ1f-"

xnas = pd.read_csv(xnas)

def search(text, create_new=False):
    if create_new:
        shutil.rmtree(indexdir)

    if not os.path.exists(indexdir) or create_new:
        os.mkdir(indexdir)
        
        schema = Schema(title=TEXT(stored=True), content=TEXT)
        ix = create_in(indexdir, schema)

        writer = ix.writer()

        for i, row in xnas.iterrows():
            writer.add_document(title="XNAS/"+row['code'], content=row['name'])
        with open(bitfinex_coins, 'r') as f:
            lines = [line.strip() for line in f]
            lines = [lines[i:i+2] for i in range(0, len(lines), 2)]
            for name, code in lines:
                writer.add_document(title=f"BITFINEX/{code}USD", content= f"{name} {code}")

        
        writer.commit()

    results = None
    ix = open_dir(indexdir)

    with ix.searcher(weighting=scoring.TF_IDF()) as searcher:
        query = QueryParser("content", ix.schema).parse(text)
        results = searcher.search(query)
        if len(results) == 0:
            return None
        return results[0]["title"]

def query(string, entities):
    """Start a query"""
    # Game name
    query = ''

    # Find entities
    for item in entities:
        if item['entity'] == 'query':
            query = item['sourceText'].lower()
    res = search(query)
    if res:
        try:
            data = quandl.get(res, order='asc').tail(30)

            if res[0] == 'B':
                data.columns = ['High', 'Low', 'Mid', 'Close', 'Open', 'Ask', 'Volume']
                for i in range(len(data)):
                    if i > 0:
                        data['Close'][i] = data['Open'][i - 1]
            current_price = data['Close'][-1]
            mpf.plot(data,type='candle', style='charles',mav=(5,10), savefig='a.png')

            cur_t = time.time()
            mpf.plot(data,type='candle', style='charles',mav=(5,10), savefig=f"{assetspath}{cur_t}.png")

            return utils.output('end', 'found', utils.translate('found', {
                'name': res,
                'price': current_price,
                'src': f'{cur_t}.png'
            }))
        except Exception as e:
            return utils.output('end', 'except', utils.translate('except', {
                'res': res,
                'error': e,
            }))

    return utils.output('end', 'not_found', utils.translate('not_found', {'query': query}))


if __name__ == '__main__':
    # print(search('bitcoin'))
    b = quandl.get('BITFINEX/BTCUSD').tail(40)

    print(b)
    b.columns = ['High', 'Low', 'Mid', 'Close', 'Open', 'Ask', 'Volume']
    