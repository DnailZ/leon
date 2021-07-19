#!/usr/bin/env python
# -*- coding:utf-8 -*-

import requests
import os
from time import time
import utils
from multiprocessing import Process
import subprocess
import json

resultpath = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'spider/result')

def lookup(string, entities):
    """Lookup a word"""

    word = ''

    # Find entities
    for item in entities:
        if item['entity'] == 'word':
            word = item['sourceText'].lower()
    
    result = ""
    try:
        with open(f'{resultpath}/{word}') as f:
            for entry in json.load(f):
                pos = entry['pos'].upper()
                result += pos + ':<br/>'

                defs = [ worddef['defination'].strip() for sense in entry['senses'] for worddef in sense['defs'] ]
                for defination in defs:
                    result += "&nbsp;"*4 + defination + '<br/>'
    except FileNotFoundError:
        return utils.output('end', 'not_found', utils.translate('not_found'))
    
    return utils.output('end', 'found', utils.translate('found', { 'result': result }))

        

    

