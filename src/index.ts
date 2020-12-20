import { config } from 'dotenv'
import { Client, Guild, GuildChannel, GuildMember, GuildMemberRoleManager, Message, Role, RoleManager, Snowflake, } from 'discord.js'
import { setTimeout } from 'timers'

config()

export let guild: Guild | undefined = undefined

const TOKEN = process.env.BOT_TOKEN
const client = new Client()

const guildName = 'Anchor'

const channelIDMap: {
  [key: string]: string
} = {
  introduce: '763330359965253642',
}

const channelMap: {
  [key: string]: GuildChannel | undefined
} = {
  introduce: undefined,
}

const roleNames = ['guest', 'verified', 'purged'] as const

type RoleName = typeof roleNames[number]

type RoleMap = {
  [key in RoleName]: Role
}

let roleMap: RoleMap

interface StreakCounter {
  [key: string]: string[]
}

const findRole = (roleManager: RoleManager | GuildMemberRoleManager, name: RoleName): Role | undefined => {
  return roleManager.cache.find(role => role.name === name)
}

const fetchAndMappingRoles = async (guild: Guild, names: readonly RoleName[]): Promise<RoleMap> => {
  const roles = await guild.roles.fetch()
  return Object.fromEntries(names.map((name: RoleName) => {
    const role = findRole(roles, name)
    if (!role) throw `not found ${name} from ${guildName}`
    return [name, role]
  })) as RoleMap
}

const hasRole = (member: GuildMember, role: RoleName) => findRole(member.roles, role)

const streak: StreakCounter = {}
let vcChangeCount: Map<Snowflake, number> = new Map()

const eventBuilder = (message: Message, allowRole: RoleName, handler: (member: GuildMember) => void) => {
  if (!message.member || !hasRole(message.member, allowRole)) return
  handler(message.member)
}

const handleGrantAuthority = (message: Message) =>
  eventBuilder(message, 'guest', (member) => {
    if (message.channel === channelMap.introduce) {
      member.roles
        .remove(roleMap.guest as Role)
        .then((member) => member.roles.add(roleMap.verified as Role))
        .catch((e) => {
          console.log(e)
        })
    }
  })

client.on('ready', async () => {
  guild = client.guilds.cache.find((guild) => guild.name === guildName)
  if (!guild) return
  roleMap = await fetchAndMappingRoles(guild, roleNames)
  guild.channels.cache.forEach((channel: GuildChannel) => {
    Object.keys(channelIDMap).forEach(async (key: string) => {
      if (channel.id === channelIDMap[key]) {
        channelMap[key] = (await client.channels.fetch(
          channelIDMap[key]
        )) as GuildChannel
      }
    })

    if (channel.name in channelMap) channelMap[channel.name] = channel
  })
})

client.on('message', (message) => {
  if (message.author.bot) return
  if (!message.guild || !message.member || !roleMap) return
  const guild = message.guild
  const member = message.member
  handleGrantAuthority(message)

  if (member !== guild?.owner) {
    streak[message.author.id]
      ? (streak[message.author.id] = [...streak[message.author.id]])
      : (streak[message.author.id] = [])

    if (streak[message.author.id].length >= 5) {
      message.delete({ reason: 'Spamming' })
      member.roles.add(roleMap.purged as Role)
      setTimeout(() => {
        member.roles.remove(roleMap.purged as Role)
      }, 10000)
    } else {
      streak[message.author.id].push(message.content)
      setTimeout(() => {
        streak[message.author.id].pop()
      }, 5000)
    }
  }

  // コマンド
  // ウンコード
  if (hasRole(member, 'verified')) {
    if (message.content.startsWith("ping")) message.channel.send("pong")
    if (message.content.startsWith("/")) {
      const args: string[] = message.content.slice(1).trim().split(/ +/)
      switch (args[0]) {
        case 'title':
          if (!args[1] || args[2]) {
            message.channel.send({
              embed: {
                color: 16757683,
                title: ":information_source: 使い方",
                description: '`/title [name]` で入っているVCのタイトルを変更できます\n' +
                  'このサーバのステータスは '
                  + (vcChangeCount.get(guild.id) as number >= 2
                    ? "レートリミットにかかっている可能性があります。"
                    : "大丈夫です。")
              }
            })
              .then(msg => setTimeout(() => { msg.delete(); message.delete() }, 5000))
            return
          }

          const cnl: GuildChannel | undefined = guild.channels.cache
            .filter(c => c.type == 'voice')
            .filter(c => !!c.members.get(message.author.id))
            .first()

          if (vcChangeCount.get(guild.id) as number >= 2) {
            message.channel.send("レートリミットにかかっている可能性があります").then(msg => setTimeout(() => { msg.delete(); message.delete() }, 5000))
            return
          }

          cnl?.setName(args[1])
            .then(async () => {
              message.react('☑')
              setTimeout(() => {
                message.deletable ? message.delete() : {}
              }, 3000)
              //ウンコード
              !vcChangeCount.has(guild.id) ?
                vcChangeCount.set(guild.id, 1)
                : vcChangeCount.set(guild.id, vcChangeCount.get(guild.id) as number + 1)
              setTimeout(() => {
                vcChangeCount.get(guild.id) == 1
                  ? vcChangeCount.delete(guild.id)
                  : vcChangeCount.set(guild.id, vcChangeCount.get(guild.id) as number - 1)
              }, 5 * 60 * 1000)
            })
            .catch((error) => {
              message.channel.send("チャンネル名の変更に失敗しました。")
              console.error(error)
            })
      }
    }
  }
})

client.on('guildMemberAdd', (member) => {
  if (member.user?.bot) return
  if (roleMap?.guest) {
    member.roles.add(roleMap.guest as Role)
  }
})

client.on('error', console.error)

client.login(TOKEN)
