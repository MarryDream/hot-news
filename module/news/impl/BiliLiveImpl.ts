import { NewsService } from "#/hot-news/module/news/NewsService";
import { ImageElem, segment, Sendable } from "@/modules/lib";
import { DB_KEY } from "#/hot-news/util/constants";
import { BiliLiveInfo, ChatInfo } from "#/hot-news/types/type";
import { getBiliLiveStatus } from "#/hot-news/util/api";
import { msToHumanize, wait } from "#/hot-news/util/tools";
import { RenderResult } from "@/modules/renderer";
import { config, renderer } from "#/hot-news/init";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import bot from "ROOT";
import { MessageType } from "@/modules/message";
import { Viewport } from "puppeteer";

export class BiliLiveImpl implements NewsService {
	private readonly viewPort: Viewport = {
		width: 2000,
		height: 1000,
		deviceScaleFactor: 3
	}
	
	async getInfo( channel?: string ): Promise<Sendable> {
		return "";
	}
	
	async handler(): Promise<void> {
		const set = await bot.redis.getSet( DB_KEY.sub_bili_ids_key );
		for ( const sub of set ) {
			// 获取QQ号/QQ群号
			const chatInfo: ChatInfo = JSON.parse( sub );
			// 获取用户订阅的UP的uid
			const uidListStr = await bot.redis.getHashField( DB_KEY.notify_bili_ids_key, `${ chatInfo.targetId }` ) || "[]";
			const uidList: number[] = JSON.parse( uidListStr );
			
			// B站直播推送
			let i = 0;
			for ( let uid of uidList ) {
				const notification_status = await bot.redis.getString( `${ DB_KEY.bili_live_notified }.${ chatInfo.targetId }.${ uid }` );
				const live: BiliLiveInfo = await getBiliLiveStatus( uid, false, config.biliLiveApiCacheTime );
				if ( !notification_status && live?.liveRoom?.liveStatus === 1 ) {
					const {
						name,
						liveRoom: { title, url, cover, watched_show: { num, text_large, text_small }, live_time }
					} = live;
					const liveTime: string = live_time === 0 ? "00:00:00" : msToHumanize( Date.now() - live_time * 1000 );
					const cacheTime: number = config.biliLiveCacheTime * 60 * 60;
					let img: ImageElem = segment.image( cover );
					if ( config.screenshotType === 2 ) {
						const res: RenderResult = await renderer.asSegment(
							"/live/index.html",
							{ uid: uid },
							this.viewPort
						);
						if ( res.code === "ok" ) {
							img = <ImageElem>res.data;
						} else {
							bot.logger.error( res.error );
						}
					}
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
					const msg: Sendable = MessageMethod.parseTemplate( config.liveTemplate, params );
					let userID: number | "all" | string = -1;
					if ( chatInfo.type === MessageType.Group ) {
						const key = `${ DB_KEY.notify_at_all_up_key }${ chatInfo.targetId }`;
						userID = await bot.redis.existListElement( key, uid ) ? "all" : -1;
					}
					await MessageMethod.sendMsg( chatInfo.type, chatInfo.targetId, msg, userID );
					await bot.redis.setString( `${ DB_KEY.bili_live_notified }.${ chatInfo.targetId }.${ uid }`, JSON.stringify( live ), cacheTime );
					i++;
				} else if ( notification_status && ( live?.liveRoom?.liveStatus === 0 || live.liveRoom?.liveStatus === 2 ) ) {
					const cache_live: BiliLiveInfo = JSON.parse( notification_status );
					const live_time: number = cache_live?.liveRoom?.live_time || 0;
					await bot.redis.deleteKey( `${ DB_KEY.bili_live_notified }.${ chatInfo.targetId }.${ uid }` );
					const liveTime: string = live_time === 0 ? "00:00:00" : msToHumanize( Date.now() - live_time * 1000 );
					bot.logger.info( `[hot-news] UID:${ uid }(${ live.name })的直播结束了，本次直播时长: ${ liveTime }` );
				}
				if ( config.pushLimit.enable && i > config.pushLimit.limitTimes ) {
					await wait( config.pushLimit.limitTime * 1000 );
					i = 0;
				}
			}
		}
	}
	
}