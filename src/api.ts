import Fastify from 'fastify'
import { Guild } from 'discord.js'

export const startAPI = (server?: Guild) => {
  const fastify = Fastify()

  fastify.register(require('fastify-cors'))

  fastify.get('/test', async (_1, response) => {
    response.send(server?.members.cache)
  })

  fastify.listen(4000)
}
