import { cancelJob, Job, scheduleJob } from "node-schedule";
import { randomInt } from "#genshin/utils/random";
import { CHANNEL_NAME, DB_KEY } from "#hot-news/util/constants";
import { getHashField } from "#hot-news/util/RedisUtils";
import { getBiliDynamicNew, getBiliLiveStatus } from "#hot-news/util/api";
import { MessageType } from "@modules/message";
import { BOT } from "@modules/bot";
import puppeteer from "puppeteer";
import { ImageElem, segment, Sendable } from "icqq";
import { renderer, scheduleNews } from "#hot-news/init";
import {
	BiliDynamicCard,
	BiliDynamicMajorArchive,
	BiliDynamicMajorArticle,
	BiliLiveInfo,
	ChatInfo,
	DynamicInfo
} from "#hot-news/types/type";
import NewsConfig from "#hot-news/module/NewsConfig";
import { formatTimestamp, msToHumanize, wait } from "#hot-news/util/tools";
import { Order } from "@modules/command";
import { AuthLevel } from "@modules/management/auth";
import { ScreenshotService } from "#hot-news/module/screenshot/ScreenshotService";
import { NewsServiceFactory } from "#hot-news/module/NewsServiceFactory";
import { RefreshCatch } from "@modules/management/refresh";

export class ScheduleNews {
	private readonly viewPort: puppeteer.Viewport;
	private readonly bot: BOT;
	private readonly config: NewsConfig;
	
	public constructor( bot: BOT, config: NewsConfig ) {
		this.viewPort = {
			width: 2000,
			height: 1000
		}
		this.bot = bot;
		this.config = config;
	}
	
	private static parseTemplate( template: string, params: Record<string, any> ): Sendable {
		let text_message: string = template;
		Object.keys( params ).forEach( key => {
			const regExp = new RegExp( "\\${\\s*" + key + "\\s*}" );
			if ( key === "img" ) {
				text_message = text_message.replace( regExp, "#1" );
				return;
			}
			if ( key === "archive" ) {
				Object.keys( params[key] ).forEach( archive_key => {
					const reg = new RegExp( "\\${\\s*archive\\." + archive_key + "\\s*}" );
					if ( archive_key === "cover" ) {
						text_message = text_message.replace( reg, "#2" );
						return;
					}
					text_message = text_message.replace( reg, params[key][archive_key] );
				} )
			}
			text_message = text_message.replace( regExp, params[key] );
		} );
		
		const img_index = template.search( /\${\s*img\s*}/ );
		const img_last_index = template.search( /\${\s*img\s*}$/ );
		const cover_index = template.search( /\${\s*archive\.cover\s*}/ );
		const cover_last_index = template.search( /\${\s*archive\.cover\s*}$/ );
		
		// 截图变量位于最后
		if ( img_last_index !== -1 ) {
			text_message = text_message.replace( "#1", "" );
			// 同时使用了视频封面图
			if ( cover_index !== -1 ) {
				const split: string[] = text_message.split( "#2" );
				return [ split[0], params["archive"]["cover"], split[1], params["img"] ];
			}
			return [ text_message, params["img"] ];
		}
		
		// 视频封面变量位于最后
		if ( cover_last_index !== -1 ) {
			text_message = text_message.replace( "#2", "" );
			// 同时使用了截图
			if ( img_index !== -1 ) {
				const split: string[] = text_message.split( "#1" );
				return [ split[0], params["img"], split[1], params["archive"]["cover"] ];
			}
			return [ text_message, params["archive"]["cover"] ];
		}
		
		// 截图变量处于中间位置
		if ( img_index !== -1 ) {
			const split: string[] = text_message.split( "#1" );
			// 同时使用了视频封面图
			if ( cover_index !== -1 ) {
				if ( cover_index < img_index ) {
					// xxxx 封面 xxxx 截图 xxxx
					const split2: string[] = split[0].split( "#2" );
					return [ split2[0], params["archive"]["cover"], split2[1], params["img"], split[1] ];
				} else {
					// xxxx 截图 xxxx 封面 xxxx
					const split2: string[] = split[1].split( "#2" );
					return [ split[0], params["img"], split2[0], params["archive"]["cover"], split2[1] ];
				}
			}
			
			return [ split[0], params["img"], split[1] ];
		}
		
		// 视频封面变量处于中间位置
		if ( cover_index !== -1 ) {
			const split: string[] = text_message.split( "#2" );
			// 同时使用了截图
			if ( img_index !== -1 ) {
				if ( img_index < cover_index ) {
					// xxxx 截图 xxxx 封面 xxxx
					const split2: string[] = split[0].split( "#1" );
					return [ split2[0], params["img"], split2[1], params["archive"]["cover"], split[1] ];
				} else {
					// xxxx 封面 xxxx 截图 xxxx
					const split2: string[] = split[1].split( "#1" );
					return [ split[0], params["archive"]["cover"], split2[0], params["img"], split2[1] ];
				}
			}
			
			return [ split[0], params["archive"]["cover"], split[1] ];
		}
		return text_message;
	}
	
	private static completeProtocol( base64Str: string ): string {
		return `base64://${ base64Str }`;
	}
	
	public async refresh(): Promise<string> {
		try {
			cancelJob( "hot-news-bilibili-dynamic-job" );
			cancelJob( "hot-news-bilibili-live-job" );
			cancelJob( "hot-news-moyu-job" );
			
			this.initSchedule();
			this.bot.logger.info( "[hot-news]定时任务重新创建完成" );
			return `[hot-news]定时任务重新创建完成`;
		} catch ( error ) {
			throw <RefreshCatch>{
				log: ( <Error>error ).stack,
				msg: `[hot-news]定时任务重新创建失败，请前往控制台查看日志`
			};
		}
	}
	
	public createNewsSchedule(): void {
		scheduleJob( "hot-news", "0 30 8 * * *", async () => {
			const sec: number = randomInt( 0, 180 );
			const time = new Date().setSeconds( sec * 10 );
			
			const job: Job = scheduleJob( time, async () => {
				NewsServiceFactory.instance( CHANNEL_NAME.toutiao ).handler().then( () => {
					this.bot.logger.debug( "[hot-news] 每日热点新闻定时任务已处理完成." );
				} );
				NewsServiceFactory.instance( CHANNEL_NAME["60sNews"] ).handler().then( () => {
					this.bot.logger.debug( "[hot-news] 60s新闻定时任务已处理完成." );
				} );
				job.cancel();
			} );
		} );
		this.bot.logger.info( "[hot-news] 每日热点新闻定时任务已创建完成..." );
	}
	
	public initSchedule(): void {
		/* 创建原神动态定时任务 */
		scheduleNews.createBiliSchedule();
		
		if ( this.config.subscribeMoyu.enable ) {
			scheduleJob( "hot-news-moyu-job", this.config.subscribeMoyu.cronRule, async () => {
				await NewsServiceFactory.instance( CHANNEL_NAME.moyu ).handler();
			} );
			this.bot.logger.info( "[hot-news] 摸鱼日报定时任务已创建完成" );
		}
	}
	
	public createBiliSchedule(): void {
		// B站动态定时轮询任务
		scheduleJob( "hot-news-bilibili-dynamic-job", this.config.biliDynamicScheduleRule, async () => {
			await this.notifyBiliDynamic();
		} );
		this.bot.logger.info( "[hot-news] [bilibili-dynamic-job] B站动态定时任务已创建完成..." );
		
		// B站直播定时轮询任务
		scheduleJob( "hot-news-bilibili-live-job", this.config.biliLiveScheduleRule, async () => {
			await this.notifyBiliLive();
		} );
		this.bot.logger.info( "[hot-news] [bilibili-live-job] B站直播定时任务已创建完成..." );
	}
	
	public async initBiliDynamic( uid: number ): Promise<void> {
		this.bot.logger.info( `[hot-news] 开始初始化B站[${ uid }]动态数据...` )
		const dynamic_list = await getBiliDynamicNew( uid, true );
		if ( dynamic_list.length > 0 ) {
			const ids: string[] = dynamic_list.map( d => d.id_str );
			await this.bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, ...ids );
		}
		this.bot.logger.info( `[hot-news] 初始化B站[${ uid }]动态数据完成.` );
	}
	
	public async initAllBiliDynamic(): Promise<void> {
		this.bot.logger.info( `[hot-news]开始初始化B站所有已订阅的UP主的动态数据...` )
		const allSubsIds: { [key: string]: string } = await this.bot.redis.getHash( DB_KEY.notify_bili_ids_key );
		const uidList: number[] = [];
		const uidStrList = Object.values( allSubsIds ) || [];
		for ( let value of uidStrList ) {
			const uids: number[] = JSON.parse( value );
			uidList.push( ...uids );
		}
		
		for ( let uid of uidList ) {
			await this.initBiliDynamic( uid );
		}
		this.bot.logger.info( `[hot-news] 初始化B站所有已订阅的UP主的动态数据完成` )
	}
	
	private async notifyBiliDynamic(): Promise<void> {
		const set = await this.bot.redis.getSet( DB_KEY.sub_bili_ids_key );
		for ( const sub of set ) {
			// 获取QQ号/QQ群号
			const chatInfo: ChatInfo = JSON.parse( sub );
			// 获取用户订阅的UP的uid
			const uidListStr = await getHashField( DB_KEY.notify_bili_ids_key, `${ chatInfo.targetId }` ) || "[]";
			const uidList: number[] = JSON.parse( uidListStr );
			
			// B站动态信息推送
			let cards: BiliDynamicCard[] = [];
			for ( let uid of uidList ) {
				const r = await getBiliDynamicNew( uid, false, this.config.biliDynamicApiCacheTime );
				if ( r.length > 0 ) {
					cards.push( ...r );
				}
			}
			const limit = await this.bot.redis.getString( `${ DB_KEY.limit_bili_dynamic_time_key }.${ chatInfo.targetId }` );
			// 默认消息24小时即为过期
			let limitMillisecond = 24 * 60 * 60 * 1000;
			if ( limit ) {
				limitMillisecond = parseInt( limit ) * 60 * 60 * 1000;
			}
			
			let i = 0;
			for ( let card of cards ) {
				const { name, mid: uid, pub_time, pub_ts } = card.modules.module_author;
				const {
					comment: { count: comment_num },
					like: { count: like_num },
					forward: { count: forward_num }
				} = card.modules.module_stat;
				const pub_tsm: number = pub_ts * 1000;
				const pub_tss: string = formatTimestamp( pub_tsm );
				// 判断动态是否已经过时
				if ( Date.now() - pub_tsm > limitMillisecond ) {
					this.bot.logger.info( `[hot-news] [${ name }]-[${ pub_tss }]发布的动态[${ card.id_str }]已过时不再推送!` )
					// 把新的动态ID加入本地数据库
					await this.bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, card.id_str );
					continue;
				}
				
				// 专栏类型
				if ( card.type === 'DYNAMIC_TYPE_ARTICLE' ) {
					await this.articleHandle( card, chatInfo );
					i++;
				} else if ( card.type === 'DYNAMIC_TYPE_LIVE_RCMD' ) {
					// do nothing
				} else if ( card.type === "DYNAMIC_TYPE_AV" ) {
					this.bot.logger.info( `[hot-news] 获取到B站[${ name }]-[${ pub_tss }]发布的新动态 [${ card.id_str }] [${ card.modules.module_dynamic.desc?.text || "投稿视频" }]` );
					const { archive } = <BiliDynamicMajorArchive>card.modules.module_dynamic.major;
					const dynamicInfo: DynamicInfo = {
						id: card.id_str,
						name,
						uid,
						pub_time,
						pub_tss,
						like_num,
						comment_num,
						forward_num,
						archive
					};
					await this.normalDynamicHandle( dynamicInfo, chatInfo );
					i++;
				} else {
					this.bot.logger.info( `[hot-news] 获取到B站[${ name }]-[${ pub_tss }]发布的新动态 [${ card.id_str }] [${ card.modules.module_dynamic.desc?.text }]` );
					const dynamicInfo: DynamicInfo = {
						id: card.id_str,
						name,
						uid,
						pub_time,
						pub_tss,
						like_num,
						comment_num,
						forward_num
					};
					await this.normalDynamicHandle( dynamicInfo, chatInfo );
					i++;
				}
				
				// 把新的动态ID加入本地数据库
				await this.bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, card.id_str );
				if ( this.config.pushLimit.enable && i > this.config.pushLimit.limitTimes ) {
					await wait( this.config.pushLimit.limitTime * 1000 );
					i = 0;
				}
			}
		}
	}
	
	private async notifyBiliLive(): Promise<void> {
		const set = await this.bot.redis.getSet( DB_KEY.sub_bili_ids_key );
		for ( const sub of set ) {
			// 获取QQ号/QQ群号
			const chatInfo: ChatInfo = JSON.parse( sub );
			// 获取用户订阅的UP的uid
			const uidListStr = await getHashField( DB_KEY.notify_bili_ids_key, `${ chatInfo.targetId }` ) || "[]";
			const uidList: number[] = JSON.parse( uidListStr );
			
			// B站直播推送
			let i = 0;
			for ( let uid of uidList ) {
				const notification_status = await this.bot.redis.getString( `${ DB_KEY.bili_live_notified }.${ chatInfo.targetId }.${ uid }` );
				const live: BiliLiveInfo = await getBiliLiveStatus( uid, false, this.config.biliLiveApiCacheTime );
				if ( !notification_status && live?.liveRoom?.liveStatus === 1 ) {
					const {
						name,
						liveRoom: { title, url, cover, watched_show: { num, text_large, text_small }, live_time }
					} = live;
					const liveTime: string = live_time === 0 ? "00:00:00" : msToHumanize( Date.now() - live_time * 1000 );
					const cacheTime: number = this.config.biliLiveCacheTime * 60 * 60;
					const img: ImageElem = segment.image( cover, true, 60 );
					const params: Record<string, any> = {
						name,
						title,
						url,
						img,
						num,
						text_large,
						text_small,
						liveTime
					}
					const msg: Sendable = ScheduleNews.parseTemplate( this.config.liveTemplate, params );
					await this.sendMsg( chatInfo.type, chatInfo.targetId, msg );
					await this.bot.redis.setString( `${ DB_KEY.bili_live_notified }.${ chatInfo.targetId }.${ uid }`, JSON.stringify( live ), cacheTime );
					i++;
				} else if ( notification_status && ( live?.liveRoom?.liveStatus === 0 || live.liveRoom?.liveStatus === 2 ) ) {
					const cache_live: BiliLiveInfo = JSON.parse( notification_status );
					const live_time: number = cache_live?.liveRoom?.live_time || 0;
					await this.bot.redis.deleteKey( `${ DB_KEY.bili_live_notified }.${ chatInfo.targetId }.${ uid }` );
					const liveTime: string = live_time === 0 ? "00:00:00" : msToHumanize( Date.now() - live_time * 1000 );
					this.bot.logger.info( `[hot-news] UID:${ uid }(${ live.name })的直播结束了，本次直播时长: ${ liveTime }` );
				}
				if ( this.config.pushLimit.enable && i > this.config.pushLimit.limitTimes ) {
					await wait( this.config.pushLimit.limitTime * 1000 );
					i = 0;
				}
			}
		}
	}
	
	private async articleHandle( card: BiliDynamicCard, { type, targetId }: ChatInfo ): Promise<void> {
		const {
			article: {
				desc,
				title,
				jump_url,
				label
			}
		} = <BiliDynamicMajorArticle>card.modules.module_dynamic.major;
		const { name, mid: uid, pub_time, pub_ts } = card.modules.module_author;
		const id = card.id_str;
		const {
			comment: { count: comment_num },
			like: { count: like_num },
			forward: { count: forward_num }
		} = card.modules.module_stat;
		const pub_tsm: number = pub_ts * 1000;
		const pub_tss: string = formatTimestamp( pub_tsm );
		this.bot.logger.info( `[hot-news] 获取到B站-[${ pub_tss }]发布的${ name }新动态 [${ id }] [${ desc }]` );
		const url = `https:${ jump_url }`;
		const params: Record<string, any> = {
			id,
			name,
			uid,
			pub_time,
			pub_tss,
			like_num,
			comment_num,
			forward_num,
			title,
			label,
			url
		}
		const msg: Sendable = ScheduleNews.parseTemplate( this.config.articleDynamicTemplate, params );
		await this.sendMsg( type, targetId, msg );
		
		// 检测是否图片消息是否已经缓存
		let imgMsg: Sendable = await this.bot.redis.getString( `${ DB_KEY.img_msg_key }.${ card.id_str }` );
		if ( imgMsg ) {
			this.bot.logger.info( `[hot-news] 检测到动态[${ card.id_str }]渲染图的缓存，不再渲染新图，直接使用缓存内容.` )
			await this.sendMsg( type, targetId, JSON.parse( imgMsg ) );
			return;
		}
		
		// 图可能比较大，单独再发送一张图
		const res = await renderer.asForFunction( url, ScreenshotService.articleDynamicPageFunction, this.viewPort );
		if ( res.code === 'ok' ) {
			imgMsg = segment.image( ScheduleNews.completeProtocol( <string>res.data ) );
			await this.bot.redis.setString( `${ DB_KEY.img_msg_key }.${ card.id_str }`, JSON.stringify( imgMsg ), this.config.biliScreenshotCacheTime );
		} else {
			this.bot.logger.error( res.error );
			imgMsg = ScheduleNews.parseTemplate( this.config.errorMsgTemplate, params );
		}
		await this.sendMsg( type, targetId, imgMsg );
	}
	
	private async sendMsg( type: number, targetId: number, msg: Sendable ) {
		if ( type === MessageType.Private ) {
			const sendMessage = this.bot.message.getSendMessageFunc( targetId, MessageType.Private );
			await sendMessage( msg );
		} else {
			const sendMessage = this.bot.message.getSendMessageFunc( -1, MessageType.Group, targetId );
			try {
				await sendMessage( msg, false );
			} catch ( e ) {
				const REMOVE = <Order>this.bot.command.getSingle( "hot-news.remove_subscribe", AuthLevel.Master );
				const message = `[${ targetId }]的订阅消息发送失败，该群可能被封禁中，可使用${ REMOVE.getHeaders()[0] }指令移除该群聊的订阅`;
				this.bot.logger.error( message, e );
				await this.bot.message.sendMaster( message );
			}
		}
	}
	
	private async normalDynamicHandle( {
		                                   id,
		                                   name,
		                                   uid,
		                                   pub_time,
		                                   pub_tss,
		                                   like_num,
		                                   comment_num,
		                                   forward_num,
		                                   archive
	                                   }: DynamicInfo, {
		                                   type,
		                                   targetId
	                                   }: ChatInfo ): Promise<void> {
		// 检测是否图片消息是否已经缓存
		const msg: string = await this.bot.redis.getString( `${ DB_KEY.img_msg_key }.${ id }` );
		if ( msg ) {
			this.bot.logger.info( `[hot-news] 检测到动态[${ id }]渲染图的缓存，不再渲染新图，直接使用缓存内容.` )
			await this.sendMsg( type, targetId, JSON.parse( msg ) );
			return;
		}
		
		let message: Sendable;
		const url = `https://t.bilibili.com/${ id }`;
		const res = await renderer.asForFunction( url, ScreenshotService.normalDynamicPageFunction, this.viewPort );
		if ( res.code === 'ok' ) {
			const img: ImageElem = segment.image( ScheduleNews.completeProtocol( <string>res.data ) );
			// 如果是视频投稿，那么把cover转为 ImageElem 对象
			if ( archive ) {
				archive.cover = segment.image( <string>archive.cover, true, 60 );
				archive.jump_url = "https:" + archive.jump_url;
				const params: Record<string, any> = {
					id,
					name,
					uid,
					pub_time,
					pub_tss,
					like_num,
					comment_num,
					forward_num,
					url,
					img,
					archive
				}
				message = ScheduleNews.parseTemplate( this.config.videoDynamicTemplate, params );
			} else {
				const params: Record<string, any> = {
					id,
					name,
					uid,
					pub_time,
					pub_tss,
					like_num,
					comment_num,
					forward_num,
					url,
					img
				}
				message = ScheduleNews.parseTemplate( this.config.dynamicTemplate, params );
			}
			await this.bot.redis.setString( `${ DB_KEY.img_msg_key }.${ id }`, JSON.stringify( message ), this.config.biliScreenshotCacheTime );
		} else {
			this.bot.logger.error( res.error );
			const params: Record<string, any> = {
				id,
				name,
				uid,
				pub_time,
				pub_tss,
				like_num,
				comment_num,
				forward_num,
				url
			}
			message = ScheduleNews.parseTemplate( this.config.errorMsgTemplate, params );
		}
		await this.sendMsg( type, targetId, message );
	}
}