import { Client, Guild, Role, TextChannel } from 'discord.js'
import { config } from 'dotenv'

config()

const client = new Client()
const TOKEN = process.env.BOT_TOKEN

interface Channels {
  [key: string]: TextChannel | undefined
}

const channels: Channels = {
  '🙋🏻│自己紹介': undefined,
}

interface Roles {
  [key: string]: Role | undefined
}

const roles: Roles = {
  guest: undefined,
  verified: undefined,
}

client.on('ready', () => {
  const server: Guild | undefined = client.guilds.cache.find(
    (guild) => guild.name === 'Anchor'
  )

  server?.channels.cache.forEach((channel: any) => {
    if (channel.name in channels) channels[channel.name] = channel
  })

  server?.roles.cache.forEach((role: Role) => {
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
})

client.on('guildMemberAdd', (member) => {
  if (member.user?.bot) return

  member.roles.add(roles.guest as Role)
})

client.on('error', console.error)

client.login(TOKEN)
