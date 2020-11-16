import { config } from 'dotenv'
import { startBot, server } from './bot'
import { startAPI } from './api'
import { EventEmitter } from 'events'

config()

const serverListener = new EventEmitter()

startBot(serverListener)

serverListener.on('serverBooted', () => {
  startAPI(server)
})
