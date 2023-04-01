import { PluginSetting, PluginSubSetting, SubInfo } from "@modules/plugin";
import { OrderConfig } from "@modules/command";
import { MessageScope, MessageType } from "@modules/message";
import { AuthLevel } from "@modules/management/auth";
import { DB_KEY } from "#hot-news/util/constants";
import { Renderer } from "@modules/renderer";
import { BOT } from "@modules/bot";
import { ScheduleNews } from "#hot-news/module/ScheduleNews";
import NewsConfig from "#hot-news/module/NewsConfig";
import FileManagement from "@modules/file";
import { ChatInfo } from "#hot-news/types/type";
import { MemberDecreaseEvent } from "icqq";
import { installDep } from "#hot-news/util/tools";
import { createServer } from "#hot-news/server";
import { findFreePort } from "@modules/utils";

const subscribe_news: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.subscribe_news",
	desc: [ "订阅消息", "(订阅源)" ],
	headers: [ "subscribe_news" ],
	regexps: [ ".*" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/subscribe_news",
	detail: "订阅每日热点新闻、B站动态、摸鱼日报，可用的订阅源包括：\n" +
		"- 新闻源：新浪、知乎、网易、头条、百度、60秒新闻。默认使用头条，仅可使用一个新闻源覆盖订阅(每天8:30~9点推送)。\n" +
		"- B站源：原神，也可以使用B站UP的uid来订阅该UP的动态和直播。\n" +
		"- 摸鱼日报源：摸鱼。"
};

const unsubscribe_news: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.unsubscribe_news",
	desc: [ "取消订阅消息", "[订阅源]" ],
	headers: [ "unsubscribe_news" ],
	regexps: [ ".+" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/unsubscribe_news",
	detail: "取消订阅的消息。可用订阅源：\n" +
		"- 新闻源: 新浪、知乎、网易、头条、百度、60秒新闻\n" +
		"- B站源: 原神、B站UP主的uid\n" +
		"- 摸鱼日报: 摸鱼"
};

const limit_genshin_dynamic_notify: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.limit_genshin_dynamic_notify",
	desc: [ "设置动态推送保留时间", "[小时]" ],
	headers: [ "lgdn" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/limit",
	detail: "设置推送动态信息的保留时间，如果这条动态已经过去了某某小时则视为用户已自行得知该消息，放弃推送该消息"
};

const my_subscribe_list: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.my_subscribe_list",
	desc: [ "我的新闻订阅列表", "" ],
	headers: [ "mysl" ],
	regexps: [ "" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/subscribe_list",
	detail: "查看我订阅的新闻和UP主"
};

const remove_subscribe: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.remove_subscribe",
	desc: [ "移除某群订阅的消息", "[群号]" ],
	headers: [ "rms" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Private,
	auth: AuthLevel.Manager,
	main: "achieves/remove_subscribe",
	detail: "该指令用户移除某个群的所有新闻和B站订阅"
};

const set_at_all: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.set_at_all",
	desc: [ "设置允许@全体的UP", "[UID]" ],
	headers: [ "sat" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Group,
	auth: AuthLevel.User,
	main: "achieves/set_at_all",
	detail: "该指令用于设置允许在直播推送时@全体的UP"
};

const unset_at_all: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.unset_at_all",
	desc: [ "移除允许@全体的UP", "[UID]" ],
	headers: [ "unsat" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Group,
	auth: AuthLevel.User,
	main: "achieves/unset_at_all",
	detail: "该指令用于移除允许在直播推送时@全体的UP。"
};

export let renderer: Renderer;
export let config: NewsConfig;
export let scheduleNews: ScheduleNews;

export async function clearSubscribe( targetId: number, messageType: MessageType, { redis, logger }: BOT ) {
	let member: string = JSON.stringify( { targetId, type: messageType } )
	// 处理原神B站动态订阅
	const exist: boolean = await redis.existSetMember( DB_KEY.sub_bili_ids_key, member )
	if ( exist ) {
		await redis.delSetMember( DB_KEY.sub_bili_ids_key, member );
		await redis.delHash( DB_KEY.notify_bili_ids_key, `${ targetId }` );
		await redis.deleteKey( `${ DB_KEY.limit_bili_dynamic_time_key }.${ targetId }` );
		await logger.info( ` [hot-news] 已为[${ targetId }]取消订阅BiliBili动态` );
	}
	
	// 处理新闻订阅
	const existNotify: boolean = await redis.existSetMember( DB_KEY.ids, member );
	if ( existNotify ) {
		await redis.delSetMember( DB_KEY.ids, member );
		await redis.delHash( DB_KEY.channel, `${ targetId }` );
		await logger.info( ` [hot-news] 已为[${ targetId }]已取消订阅新闻服务` );
	}
}

/* 若开启必须添加好友，则删除好友后清除订阅服务 */
async function decreaseFriend( userId: number, bot: BOT ): Promise<void> {
	if ( bot.config.addFriend ) {
		await clearSubscribe( userId, MessageType.Private, bot );
	}
}

function loadConfig( file: FileManagement ): NewsConfig {
	const initCfg = NewsConfig.init;
	const fileName: string = "hot_news";
	
	const path: string = file.getFilePath( `${ fileName }.yml` );
	const isExist: boolean = file.isExist( path );
	if ( !isExist ) {
		file.createYAML( fileName, initCfg );
		return new NewsConfig( initCfg );
	}
	
	const config: any = file.loadYAML( fileName );
	const keysNum = o => Object.keys( o ).length;
	
	/* 检查 defaultConfig 是否更新 */
	if ( keysNum( config ) !== keysNum( initCfg ) ) {
		const c: any = {};
		const keys: string[] = Object.keys( initCfg );
		for ( let k of keys ) {
			c[k] = config[k] ? config[k] : initCfg[k];
		}
		file.writeYAML( fileName, c );
		return new NewsConfig( c );
	}
	return new NewsConfig( config );
}

export async function newsSubs( { redis }: BOT ): Promise<SubInfo[]> {
	const subNewsIds: string[] = await redis.getSet( DB_KEY.ids );
	const newsSubUsers: number[] = subNewsIds.map( value => {
		const { type, targetId }: ChatInfo = JSON.parse( value );
		if ( type === MessageType.Private ) {
			return targetId;
		}
		return -1;
	} ).filter( value => value !== -1 );
	
	const subBiliIds: string[] = await redis.getSet( DB_KEY.sub_bili_ids_key );
	const biliSubUsers: number[] = subBiliIds.map( value => {
		const { type, targetId }: ChatInfo = JSON.parse( value );
		if ( type === MessageType.Private ) {
			return targetId;
		}
		return -1;
	} ).filter( value => value !== -1 );
	
	return [ {
		name: "新闻订阅",
		users: newsSubUsers
	}, {
		name: "B站订阅",
		users: biliSubUsers
	} ]
}

// noinspection JSUnusedGlobalSymbols
export async function subInfo(): Promise<PluginSubSetting> {
	return {
		subs: newsSubs,
		reSub: decreaseFriend
	}
}

function decreaseGroup( bot: BOT ): void {
	bot.client.on( "notice.group.decrease", async ( memberData: MemberDecreaseEvent ) => {
		// 如果退出群聊的是 BOT 或者群被解散那么就把该群聊的新闻订阅全部取消
		if ( memberData.user_id === bot.config.number || memberData.dismiss ) {
			await clearSubscribe( memberData.user_id, MessageType.Group, bot );
		}
	} );
}

// 不可 default 导出，函数名固定
export async function init( bot: BOT ): Promise<PluginSetting> {
	const port: number = await findFreePort( 3892, bot.logger );
	/* 加载 hot_news.yml 配置 */
	config = loadConfig( bot.file );
	
	scheduleNews = new ScheduleNews( bot, config );
	/* 创建每日新闻定时任务 */
	scheduleNews.createNewsSchedule();
	
	/* 初始化B站所有已订阅的UP主的动态数据 */
	await scheduleNews.initAllBiliDynamic();
	
	/* 实例化渲染器 */
	renderer = bot.renderer.register( "hot-news", "/views", port, "#app" );
	
	/* 初始化杂项定时任务 */
	scheduleNews.initSchedule();
	
	// 监听群聊退出事件
	decreaseGroup( bot );
	bot.logger.info( "[hot-news]群聊退出事件监听已启动成功" )
	
	bot.refresh.registerRefreshableFile( "hot_news", config );
	bot.refresh.registerRefreshableFunc( scheduleNews );
	
	// 检测并安装依赖
	installDep( bot ).then();
	
	createServer( port, bot.logger );
	
	return {
		pluginName: "hot-news",
		aliases: config.aliases,
		cfgList: [ subscribe_news, unsubscribe_news, limit_genshin_dynamic_notify
			, my_subscribe_list, remove_subscribe, set_at_all, unset_at_all ],
		repo: {
			owner: "BennettChina",
			repoName: "hot-news",
			ref: "main"
		}
	};
}