import { Renderer } from "@/modules/renderer";
import { ScheduleNews } from "#/hot-news/module/ScheduleNews";
import NewsConfig, { INewsConfig } from "#/hot-news/module/NewsConfig";
import { definePlugin } from "@/modules/plugin";
import cfgList from "#/hot-news/commands";
import bot from "ROOT";
import routers from "#/hot-news/routes";
import { DB_KEY } from "#/hot-news/util/constants";
import { ChatInfo } from "#/hot-news/types/type";
import { MessageType } from "@/modules/message";
import { BOT } from "@/modules/bot";
import { cancelJob } from "node-schedule";
import { installDep } from "#/hot-news/util/tools";

export let renderer: Renderer;
export let config: INewsConfig;
export let scheduleNews: ScheduleNews;

export async function clearSubscribe( targetId: number, messageType: MessageType, { redis, logger }: BOT ) {
	let member: string = JSON.stringify( { targetId, type: messageType } )
	// 处理原神B站动态订阅
	const exist: boolean = await redis.existSetMember( DB_KEY.sub_bili_ids_key, member )
	if ( exist ) {
		await redis.delSetMember( DB_KEY.sub_bili_ids_key, member );
		await redis.delHash( DB_KEY.notify_bili_ids_key, `${ targetId }` );
		await redis.deleteKey( `${ DB_KEY.limit_bili_dynamic_time_key }.${ targetId }` );
		logger.info( ` [hot-news] 已为[${ targetId }]取消订阅BiliBili动态` );
	}
	
	// 处理新闻订阅
	const existNotify: boolean = await redis.existSetMember( DB_KEY.ids, member );
	if ( existNotify ) {
		await redis.delSetMember( DB_KEY.ids, member );
		await redis.delHash( DB_KEY.channel, `${ targetId }` );
		logger.info( ` [hot-news] 已为[${ targetId }]已取消订阅新闻服务` );
	}
}

export default definePlugin( {
	name: "新闻订阅",
	aliases: [ "消息订阅", "新闻订阅", "热点新闻" ],
	cfgList,
	renderer: {
		mainFiles: [ "index" ]
	},
	server: {
		routers
	},
	repo: {
		owner: "BennettChina",
		repoName: "hot-news",
		ref: "v3"
	},
	subscribe: [
		{
			name: "新闻订阅",
			getUser() {
				return ( async () => {
					const json_str: string[] = await bot.redis.getSet( DB_KEY.ids );
					const subs: ChatInfo[] = json_str.map( value => {
						return JSON.parse( value );
					} );
					return {
						person: subs.filter( value => value.type === MessageType.Private ).map( value => value.targetId ),
						group: subs.filter( value => value.type === MessageType.Group ).map( value => value.targetId )
					}
				} )()
			},
			async reSub( userId, type ) {
				const messageType: MessageType = type === "private" ? MessageType.Private : MessageType.Group;
				await clearSubscribe( userId, messageType, bot );
			}
		},
		{
			name: "B站订阅",
			getUser() {
				return ( async () => {
					const json_str: string[] = await bot.redis.getSet( DB_KEY.sub_bili_ids_key );
					const subs: ChatInfo[] = json_str.map( value => {
						return JSON.parse( value );
					} );
					return {
						person: subs.filter( value => value.type === MessageType.Private ).map( value => value.targetId ),
						group: subs.filter( value => value.type === MessageType.Group ).map( value => value.targetId )
					}
				} )()
			},
			async reSub( userId, type ) {
				const messageType: MessageType = type === "private" ? MessageType.Private : MessageType.Group;
				await clearSubscribe( userId, messageType, bot );
			}
		}
	],
	mounted( params ) {
		config = params.configRegister( "hot-news", NewsConfig.init );
		scheduleNews = new ScheduleNews( bot, config );
		params.refreshRegister( scheduleNews );
		
		/* 实例化渲染器 */
		renderer = params.renderRegister( "#app" );
		
		// 安装依赖
		installDep( params ).then();
	},
	unmounted() {
		// 卸载插件时把定时任务清掉
		cancelJob( "hot-news-bilibili-dynamic-job" );
		cancelJob( "hot-news-bilibili-live-job" );
		cancelJob( "hot-news-moyu-job" );
	}
} );