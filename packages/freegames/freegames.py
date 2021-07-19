#!/usr/bin/env python
# -*- coding:utf-8 -*-

import requests
import os
from time import time
import utils
from multiprocessing import Process
import subprocess

gamelist = { "ant", "bagels", "bounce", "cannon", "connect", "crypto", "fidget", "flappy", "guess", "life", "maze", "memory", "minesweeper", "pacman", "paint", "pong", "simonsays", "snake", "tictactoe", "tiles", "tron" }


def start(string, entities):
    """Start a game"""
    # Game name
    gamename = ''

    # Find entities
    for item in entities:
        if item['entity'] == 'game':
            gamename = item['sourceText'].lower()

    if gamename in gamelist:
        subprocess.run(["python", "-m", f"freegames.{gamename}"])
        return utils.output('end', 'start_game', utils.translate('start_game'))
    else:
        return utils.output('end', 'game_not_provided', utils.translate('game_not_provided'))

        

    

