import { Client, Guild, GuildChannel, Role } from 'discord.js'
import { EventEmitter } from 'events'

export let server: Guild | undefined = undefined

export const startBot = (serverListener: EventEmitter) => {
  const TOKEN = process.env.BOT_TOKEN
  const client = new Client()

  interface ChannelID {
    [key: string]: string
  }

  interface Channels {
    [key: string]: GuildChannel | undefined
  }

  const channelIDs: ChannelID = {
    introduce: '763330359965253642',
  }

  const channels: Channels = {
    introduce: undefined,
  }

  interface RoleID {
    [key: string]: string
  }

  interface Roles {
    [key: string]: Role | undefined
  }

  const roleIDs: RoleID = {
    guest: '762911303827324939',
    verified: '762911175397736459',
    purged: '777870836002455564',
  }

  const roles: Roles = {
    guest: undefined,
    verified: undefined,
    purged: undefined,
  }

  interface StreakCounter {
    [key: string]: string[]
  }

  const streak: StreakCounter = {}

  client.on('ready', async () => {
    server = await client.guilds.cache.find((guild) => guild.name === 'Anchor')

    server?.channels.cache.forEach((channel: GuildChannel) => {
      Object.keys(channelIDs).forEach(async (key: string) => {
        if (channel.id === channelIDs[key]) {
          channels[key] = (await client.channels.fetch(
            channelIDs[key]
          )) as GuildChannel
        }
      })

      if (channel.name in channels) channels[channel.name] = channel
    })

    serverListener.emit('serverBooted')

    server?.roles.cache.forEach((role: Role) => {
      Object.keys(roleIDs).forEach(async (key: string) => {
        if (role.id === roleIDs[key]) {
          roles[key] = (await server?.roles.fetch(roleIDs[key])) as Role
        }
      })

      if (role.name.toLocaleLowerCase() in roles)
        roles[role.name.toLocaleLowerCase()] = role
    })
  })

  client.on('message', (message) => {
    if (message.author.bot) return

    if (message.channel === channels.introduce) {
      if (!message.member?.roles.cache.find((role) => role === roles.guest))
        return

      message.member?.roles
        .remove(roles.guest as Role)
        .then((member) => member.roles.add(roles.verified as Role))
        .catch((e) => {
          console.log(e)
        })
    }

    if (message.member !== server?.owner) {
      streak[message.author.id]
        ? (streak[message.author.id] = [...streak[message.author.id]])
        : (streak[message.author.id] = [])

      if (streak[message.author.id].length >= 5) {
        message.delete({ reason: 'Spamming' })
        message.member?.roles.add(roles.purged as Role)
        setTimeout(() => {
          message.member?.roles.remove(roles.purged as Role)
        }, 10000)
      } else {
        streak[message.author.id].push(message.content)
        setTimeout(() => {
          streak[message.author.id].pop()
        }, 5000)
      }
    }
  })

  client.on('guildMemberAdd', (member) => {
    if (member.user?.bot) return

    member.roles.add(roles.guest as Role)
  })

  client.on('error', console.error)

  client.login(TOKEN)
}
