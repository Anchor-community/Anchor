import { config } from 'dotenv'
import { Client, Guild, GuildChannel, GuildMember, Role, Snowflake } from 'discord.js'
import { setTimeout } from 'timers'

config()

export let server: Guild | undefined = undefined

const TOKEN = process.env.BOT_TOKEN
const client = new Client()

const hasRole = (member: GuildMember, roleID: string): boolean => {
  return member.roles.cache.has(roleID)
}

interface ChannelMap {
  [key: string]: GuildChannel | undefined
}

const channelIDMap: {
  [key: string]: string
} = {
  introduce: '763330359965253642',
}

const channelMap: ChannelMap = {
  introduce: undefined,
}

interface Roles {
  [key: string]: Role | undefined
}

const roleIDMap: { 
  [key: string]: string 
} = {
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
let vcChangeCount: Map<Snowflake,number> = new Map()

client.on('ready', async () => {
  server = await client.guilds.cache.find((guild) => guild.name === 'Anchor')
  if (!server) return

  server.channels.cache.forEach((channel: GuildChannel) => {
    Object.keys(channelIDMap).forEach(async (key: string) => {
      if (channel.id === channelIDMap[key]) {
        channelMap[key] = (await client.channels.fetch(
          channelIDMap[key]
        )) as GuildChannel
      }
    })

    if (channel.name in channelMap) channelMap[channel.name] = channel
  })

  server.roles.cache.forEach((role: Role) => {
    Object.keys(roleIDMap).forEach(async (key: string) => {
      if (role.id === roleIDMap[key] && server) {
        roles[key] = (await server.roles.fetch(roleIDMap[key])) as Role
      }
    })

    if (role.name.toLocaleLowerCase() in roles)
      roles[role.name.toLocaleLowerCase()] = role
  })
})

client.on('message', (message) => {
  if (message.author.bot) return
  if (!message.guild || !message.member) return
  const guild = message.guild
  const member = message.member
  if (message.channel === channelMap.introduce) {
    console.log(
      'message.channel === channelMap.introduce',
      message.channel === channelMap.introduce
    )
    if (!member.roles.cache.find((role) => role === roles.guest))
      return

    console.log(
      '!member.roles.cache.find((role) => role === roles.guest)',
      !member.roles.cache.find((role) => role === roles.guest)
    )

    member.roles
      .remove(roles.guest as Role)
      .then((member) => member.roles.add(roles.verified as Role))
      .catch((e) => {
        console.log(e)
      })
  }

  if (member !== server?.owner) {
    streak[message.author.id]
      ? (streak[message.author.id] = [...streak[message.author.id]])
      : (streak[message.author.id] = [])

    if (streak[message.author.id].length >= 5) {
      message.delete({ reason: 'Spamming' })
      member.roles.add(roles.purged as Role)
      setTimeout(() => {
        member.roles.remove(roles.purged as Role)
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
  if(message.member && hasRole(message.member, roleIDMap.verified)) {
    if(message.content.startsWith("ping")) message.channel.send("pong")
    if(message.content.startsWith("/")) {
      const args: string[] = message.content.slice(1).trim().split(/ +/)
      switch(args[0]) {
        case 'title':
          if(!args[1] || args[2]) {
            message.channel.send({
              embed: {
              color: 16757683,
              title: ":information_source: 使い方",
              description: '`/title [name]` で入っているVCのタイトルを変更できます\n'+
                'このサーバのステータスは ' 
                + (vcChangeCount.get(guild.id) as number >= 2 
                  ? "レートリミットにかかっている可能性があります。" 
                  : "大丈夫です。") 
            }})
              .then(msg => setTimeout(() => {msg.delete(); message.delete()},5000))
            return
          }

          const cnl: GuildChannel | undefined = guild.channels.cache
            .filter(c => c.type == 'voice')
            .filter(c => !!c.members.get(message.author.id))
            .first()

          if(vcChangeCount.get(guild.id) as number >= 2){
            message.channel.send("レートリミットにかかっている可能性があります").then(msg => setTimeout(() => {msg.delete(); message.delete()},5000))
            return
          }

          cnl?.setName(args[1])
            .then(async() => {
              message.react('☑')
              setTimeout(()=> {
                message.deletable ? message.delete() : {}
              },3000)
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

  member.roles.add(roles.guest as Role)
})

client.on('error', console.error)

client.login(TOKEN)
